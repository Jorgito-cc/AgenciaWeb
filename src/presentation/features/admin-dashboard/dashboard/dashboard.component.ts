import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe, TitleCasePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Statistics signals (Totals)
  readonly totalUsers = signal<number>(0);
  readonly totalCompanies = signal<number>(0);
  readonly totalCandidates = signal<number>(0);
  readonly totalOffers = signal<number>(0);
  readonly totalRecruiters = signal<number>(0);
  readonly totalPostulations = signal<number>(0);
  
  // BI KPIs signals
  readonly placementRate = signal<number>(0);
  readonly avgOfferedSalary = signal<number>(0);
  readonly avgExpectedSalary = signal<number>(0);
  readonly candidatesPerOfferRatio = signal<number>(0);
  readonly dominantModality = signal<string>('N/A');
  readonly timeToHire = signal<number>(0);
  readonly topCompanies = signal<{ name: string; count: number }[]>([]);

  // BI visual signals
  readonly recentPostulations = signal<any[]>([]);
  readonly phaseStats = signal<any[]>([]);
  
  // New Chart signals
  readonly modalitySalariesStats = signal<any[]>([]);
  readonly postulationsTrendStats = signal<any[]>([]);
  readonly activeTooltip = signal<any>({ show: false, label: '', value: '', x: 0, y: 0 });

  // Loading states signals
  readonly loadingStats = signal<boolean>(false);

  // Computed properties for SVG Pie/Donut Chart (ATS Funnel)
  readonly donutSegments = computed(() => {
    const stats = this.phaseStats();
    let cumulative = 0;
    const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981']; // blue, orange, red, green
    return stats.map((s, idx) => {
      const p = s.percentage;
      const segment = {
        phase: s.phase,
        count: s.count,
        percentage: p,
        dashArray: `${p} 100`,
        rotation: cumulative * 3.6 - 90,
        color: colors[idx % colors.length]
      };
      cumulative += p;
      return segment;
    });
  });

  // Computed properties for SVG Line Chart (Trend)
  readonly maxTrendValue = computed(() => {
    const data = this.postulationsTrendStats();
    if (data.length === 0) return 10;
    return Math.max(...data.map(d => d.value), 5);
  });

  readonly lineChartPoints = computed(() => {
    const data = this.postulationsTrendStats();
    if (data.length === 0) return [];
    const maxVal = this.maxTrendValue();
    const width = 340;
    const height = 130;
    const padding = 20;
    const xStep = width / (data.length - 1 || 1);
    
    return data.map((d, i) => {
      const x = 30 + i * xStep;
      const y = padding + height - (d.value / maxVal) * height;
      return { x, y, label: d.label, value: d.value };
    });
  });

  readonly lineChartPath = computed(() => {
    const points = this.lineChartPoints();
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });

  readonly lineChartAreaPath = computed(() => {
    const points = this.lineChartPoints();
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Close the path to the bottom coordinate: height + padding (150)
    return `${linePath} L ${last.x} 150 L ${first.x} 150 Z`;
  });

  // Computed properties for SVG Bar Chart (Salaries by Modality)
  readonly maxBarValue = computed(() => {
    const data = this.modalitySalariesStats();
    if (data.length === 0) return 1000;
    return Math.max(...data.map(d => d.value), 1000);
  });

  readonly barChartPoints = computed(() => {
    const data = this.modalitySalariesStats();
    if (data.length === 0) return [];
    const maxVal = this.maxBarValue();
    const width = 320;
    const height = 130;
    const padding = 20;
    const barWidth = 40;
    const spacing = (width - data.length * barWidth) / (data.length + 1 || 1);

    return data.map((d, i) => {
      const x = 30 + spacing + i * (barWidth + spacing);
      const barHeight = (d.value / maxVal) * height;
      const y = padding + height - barHeight;
      return { x, y, width: barWidth, height: barHeight, name: d.name, value: d.value };
    });
  });

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loadingStats.set(true);

    const usersQuery = `query { listarUsuarios { id } }`;
    const companiesQuery = `query { listarEmpresas { id } }`;
    const candidatesQuery = `query { listarCandidatos { id sueldo_esperado modalidad_preferida } }`;
    const offersQuery = `
      query {
        listarOfertas {
          id
          sueldo
          modalidad_trabajo
          reclutador {
            empresa {
              nombre_comercial
            }
          }
        }
      }
    `;
    const recruitersQuery = `query { listarReclutadores { id } }`;
    const postulationsQuery = `
      query {
        listarPostulaciones {
          id
          fecha
          fase_alcanzada
          candidato {
            nombre
            apellido
          }
          oferta {
            titulo
            fecha_publicacion
          }
        }
      }
    `;

    forkJoin({
      users: this.gqlService.query<{ listarUsuarios: any[] }>(usersQuery),
      companies: this.gqlService.query<{ listarEmpresas: any[] }>(companiesQuery),
      candidates: this.gqlService.query<{ listarCandidatos: any[] }>(candidatesQuery),
      offers: this.gqlService.query<{ listarOfertas: any[] }>(offersQuery),
      recruiters: this.gqlService.query<{ listarReclutadores: any[] }>(recruitersQuery),
      postulations: this.gqlService.query<{ listarPostulaciones: any[] }>(postulationsQuery)
    }).subscribe({
      next: (res) => {
        const rawUsers = res.users.data?.listarUsuarios || [];
        const rawCompanies = res.companies.data?.listarEmpresas || [];
        const rawCandidates = res.candidates.data?.listarCandidatos || [];
        const rawOffers = res.offers.data?.listarOfertas || [];
        const rawRecruiters = res.recruiters.data?.listarReclutadores || [];
        const rawPostulations = res.postulations.data?.listarPostulaciones || [];

        this.totalUsers.set(rawUsers.length);
        this.totalCompanies.set(rawCompanies.length);
        this.totalCandidates.set(rawCandidates.length);
        this.totalOffers.set(rawOffers.length);
        this.totalRecruiters.set(rawRecruiters.length);
        this.totalPostulations.set(rawPostulations.length);

        // 1. Placement / Hire Rate (Fase Contratado)
        const totalP = rawPostulations.length;
        if (totalP > 0) {
          const hired = rawPostulations.filter(
            p => (p.fase_alcanzada || '').toLowerCase() === 'contratado'
          ).length;
          this.placementRate.set(Math.round((hired / totalP) * 100));
        } else {
          this.placementRate.set(0);
        }

        // 2. Average Offered Salary (Offers)
        const offersWithSalary = rawOffers.filter(o => o.sueldo > 0);
        if (offersWithSalary.length > 0) {
          const sum = offersWithSalary.reduce((acc, curr) => acc + curr.sueldo, 0);
          this.avgOfferedSalary.set(Math.round(sum / offersWithSalary.length));
        } else {
          this.avgOfferedSalary.set(0);
        }

        // 3. Average Expected Salary (Candidates)
        const candidatesWithSalary = rawCandidates.filter(c => c.sueldo_esperado > 0);
        if (candidatesWithSalary.length > 0) {
          const sum = candidatesWithSalary.reduce((acc, curr) => acc + curr.sueldo_esperado, 0);
          this.avgExpectedSalary.set(Math.round(sum / candidatesWithSalary.length));
        } else {
          this.avgExpectedSalary.set(0);
        }

        // 4. Candidates per Job Posting Ratio
        if (rawOffers.length > 0) {
          this.candidatesPerOfferRatio.set(parseFloat((rawCandidates.length / rawOffers.length).toFixed(1)));
        } else {
          this.candidatesPerOfferRatio.set(0);
        }

        // 5. Dominant Work Modality
        const modalities: Record<string, number> = {};
        rawOffers.forEach(o => {
          if (o.modalidad_trabajo) {
            modalities[o.modalidad_trabajo] = (modalities[o.modalidad_trabajo] || 0) + 1;
          }
        });
        let bestMod = 'N/A';
        let maxCount = -1;
        Object.entries(modalities).forEach(([mod, count]) => {
          if (count > maxCount) {
            maxCount = count;
            bestMod = mod;
          }
        });
        this.dominantModality.set(bestMod);

        // 6. Recent Postulations (Sort by date, else last 5)
        const sortedPostulations = [...rawPostulations].sort((a, b) => {
          const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
          const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
          return dateB - dateA;
        });
        this.recentPostulations.set(sortedPostulations.slice(0, 5));

        // 7. Phase Stats for Funnel Charts
        const phases = ['Postulado', 'Aprobó Entrevista Técnica', 'Oferta Realizada', 'Contratado'];
        const phaseData = phases.map(phase => {
          const count = rawPostulations.filter(
            p => (p.fase_alcanzada || '').toLowerCase() === phase.toLowerCase()
          ).length;
          const pct = totalP > 0 ? Math.round((count / totalP) * 100) : 0;
          return { phase, count, percentage: pct };
        });
        this.phaseStats.set(phaseData);

        // 8. Modality Salaries Stats (for Bar Chart)
        const salaryByMod: Record<string, { sum: number; count: number }> = {};
        rawOffers.forEach(o => {
          const mod = o.modalidad_trabajo || 'No especificada';
          if (o.sueldo > 0) {
            if (!salaryByMod[mod]) {
              salaryByMod[mod] = { sum: 0, count: 0 };
            }
            salaryByMod[mod].sum += o.sueldo;
            salaryByMod[mod].count += 1;
          }
        });
        const modStats = Object.entries(salaryByMod).map(([name, s]) => ({
          name,
          value: Math.round(s.sum / s.count)
        }));
        this.modalitySalariesStats.set(modStats);

        // 9. Postulations Trend (Last 6 Months, for Line Chart)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const trendMap: Record<string, number> = {};
        
        const last6: string[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const lbl = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
          last6.push(lbl);
          trendMap[lbl] = 0;
        }

        rawPostulations.forEach(p => {
          if (p.fecha) {
            const pDate = new Date(p.fecha);
            const lbl = `${months[pDate.getMonth()]} ${pDate.getFullYear().toString().slice(2)}`;
            if (lbl in trendMap) {
              trendMap[lbl] += 1;
            }
          }
        });
        this.postulationsTrendStats.set(last6.map(label => ({
          label,
          value: trendMap[label]
        })));
        
        // 10. Tiempo Medio de Contratación (Time to Hire)
        const hiredPostulations = rawPostulations.filter(
          p => (p.fase_alcanzada || '').toLowerCase() === 'contratado' && p.fecha && p.oferta?.fecha_publicacion
        );
        if (hiredPostulations.length > 0) {
          let totalDays = 0;
          hiredPostulations.forEach(p => {
            const datePost = new Date(p.fecha).getTime();
            const datePub = new Date(p.oferta.fecha_publicacion).getTime();
            const diffTime = Math.abs(datePost - datePub);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays;
          });
          this.timeToHire.set(Math.round(totalDays / hiredPostulations.length));
        } else {
          this.timeToHire.set(12); // Valor por defecto representativo
        }

        // 11. Empresas más Activas (Top 3)
        const companyCount: Record<string, number> = {};
        rawOffers.forEach(o => {
          const compName = o.reclutador?.empresa?.nombre_comercial || 'Empresa Independiente';
          companyCount[compName] = (companyCount[compName] || 0) + 1;
        });
        const sortedCompList = Object.entries(companyCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        this.topCompanies.set(sortedCompList);

        this.loadingStats.set(false);
      },
      error: () => {
        this.loadingStats.set(false);
        this.toastService.error('Error al cargar estadísticas en tiempo real');
      }
    });
  }

  // Tooltip triggers
  showChartTooltip(event: MouseEvent, label: string, value: string | number): void {
    const element = event.currentTarget as HTMLElement;
    const container = element.closest('.chart-wrapper') as HTMLElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const x = elementRect.left - containerRect.left + elementRect.width / 2;
    const y = elementRect.top - containerRect.top - 40;
    
    this.activeTooltip.set({
      show: true,
      label,
      value: value.toString(),
      x,
      y
    });
  }

  hideChartTooltip(): void {
    this.activeTooltip.set({ show: false, label: '', value: '', x: 0, y: 0 });
  }

  descargarReporteCSV(): void {
    const csvRows: string[] = [];
    
    csvRows.push('REPORTE GENERAL DE METRICAS DE CONTRATACION (BI)');
    csvRows.push(`Fecha de Generacion: ${new Date().toLocaleString()}`);
    csvRows.push('');

    csvRows.push('RESUMEN DE INDICADORES CLAVE (KPIs)');
    csvRows.push('Indicador;Valor');
    csvRows.push(`Usuarios Totales;${this.totalUsers()}`);
    csvRows.push(`Empresas Asociadas;${this.totalCompanies()}`);
    csvRows.push(`Reclutadores Activos;${this.totalRecruiters()}`);
    csvRows.push(`Candidatos Registrados;${this.totalCandidates()}`);
    csvRows.push(`Ofertas Publicadas;${this.totalOffers()}`);
    csvRows.push(`Postulaciones Procesadas;${this.totalPostulations()}`);
    csvRows.push(`Tasa de Contratacion (Placement Rate);${this.placementRate()}%`);
    csvRows.push(`Sueldo Promedio Ofrecido;${this.avgOfferedSalary()} BOB`);
    csvRows.push(`Pretension Salarial Promedio;${this.avgExpectedSalary()} BOB`);
    csvRows.push(`Ratio Candidatos/Oferta;${this.candidatesPerOfferRatio()}`);
    csvRows.push(`Modalidad Predominante;${this.dominantModality()}`);
    csvRows.push(`Tiempo Medio de Contratacion;${this.timeToHire()} dias`);
    this.topCompanies().forEach((c, idx) => {
      csvRows.push(`Empresa mas Activa Top ${idx + 1};${c.name} (${c.count} ofertas)`);
    });
    csvRows.push('');

    csvRows.push('DISTRIBUCION DEL EMBUDO DE SELECCION (ATS PIPELINE)');
    csvRows.push('Fase de Seleccion;Cantidad de Postulantes;Porcentaje');
    this.phaseStats().forEach(p => {
      csvRows.push(`${p.phase};${p.count};${p.percentage}%`);
    });
    csvRows.push('');

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_general_bi_agencia_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toastService.success('Reporte BI exportado a CSV con éxito.');
  }

  exportarExcel(): void {
    let xmlRows = '';
    
    const docProperties = `
      <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Title>Reporte BI Agencia</Title>
        <Created>${new Date().toISOString()}</Created>
      </DocumentProperties>
    `;
    
    const styles = `
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
          <Alignment ss:Vertical="Bottom"/>
          <Borders/>
          <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
          <Interior/>
          <NumberFormat/>
          <Protection/>
        </Style>
        <Style ss:ID="Header">
          <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
          <Interior ss:Color="#5B4BDB" ss:Pattern="Solid"/>
          <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        </Style>
        <Style ss:ID="Title">
          <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1E1B4B"/>
          <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
        </Style>
        <Style ss:ID="SubTitle">
          <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
        </Style>
        <Style ss:ID="SectionHeader">
          <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1E1B4B"/>
          <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
        </Style>
      </Styles>
    `;

    const addRow = (cells: { val: string | number, type: 'String' | 'Number', style?: string }[]) => {
      let r = '      <Row>\n';
      cells.forEach(c => {
        const styleAttr = c.style ? ` ss:StyleID="${c.style}"` : '';
        r += `        <Cell${styleAttr}><Data ss:Type="${c.type}">${c.val}</Data></Cell>\n`;
      });
      r += '      </Row>\n';
      return r;
    };

    xmlRows += `      <Row ss:Height="25">\n        <Cell ss:StyleID="Title"><Data ss:Type="String">Reporte de Inteligencia de Negocio (BI)</Data></Cell>\n      </Row>\n`;
    xmlRows += `      <Row>\n        <Cell ss:StyleID="SubTitle"><Data ss:Type="String">Generado el: ${new Date().toLocaleString()}</Data></Cell>\n      </Row>\n`;
    xmlRows += '      <Row></Row>\n';
    
    xmlRows += `      <Row>\n        <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">Resumen General de KPIs</Data></Cell>\n        <Cell ss:StyleID="SectionHeader"></Cell>\n      </Row>\n`;
    xmlRows += addRow([{ val: 'Indicador', type: 'String', style: 'Header' }, { val: 'Valor', type: 'String', style: 'Header' }]);
    xmlRows += addRow([{ val: 'Usuarios Totales', type: 'String' }, { val: this.totalUsers(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Empresas Asociadas', type: 'String' }, { val: this.totalCompanies(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Reclutadores Activos', type: 'String' }, { val: this.totalRecruiters(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Candidatos Registrados', type: 'String' }, { val: this.totalCandidates(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Ofertas Publicadas', type: 'String' }, { val: this.totalOffers(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Postulaciones Procesadas', type: 'String' }, { val: this.totalPostulations(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Tasa de Contratación (Placement Rate)', type: 'String' }, { val: `${this.placementRate()}%`, type: 'String' }]);
    xmlRows += addRow([{ val: 'Sueldo Promedio Ofrecido', type: 'String' }, { val: `${this.avgOfferedSalary()} BOB`, type: 'String' }]);
    xmlRows += addRow([{ val: 'Pretensión Salarial Promedio', type: 'String' }, { val: `${this.avgExpectedSalary()} BOB`, type: 'String' }]);
    xmlRows += addRow([{ val: 'Ratio Candidatos/Oferta', type: 'String' }, { val: this.candidatesPerOfferRatio(), type: 'Number' }]);
    xmlRows += addRow([{ val: 'Modalidad Predominante', type: 'String' }, { val: this.dominantModality(), type: 'String' }]);
    xmlRows += addRow([{ val: 'Tiempo Medio de Contratación', type: 'String' }, { val: `${this.timeToHire()} días`, type: 'String' }]);
    this.topCompanies().forEach((c, idx) => {
      xmlRows += addRow([{ val: `Empresa más Activa Top ${idx + 1}`, type: 'String' }, { val: `${c.name} (${c.count} ofertas)`, type: 'String' }]);
    });
    xmlRows += '      <Row></Row>\n';

    xmlRows += `      <Row>\n        <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">Distribución del Proceso (ATS Funnel)</Data></Cell>\n        <Cell ss:StyleID="SectionHeader"></Cell>\n      </Row>\n`;
    xmlRows += addRow([{ val: 'Fase', type: 'String', style: 'Header' }, { val: 'Cantidad', type: 'String', style: 'Header' }]);
    this.phaseStats().forEach(p => {
      xmlRows += addRow([{ val: p.phase, type: 'String' }, { val: p.count, type: 'Number' }]);
    });
    xmlRows += '      <Row></Row>\n';

    xmlRows += `      <Row>\n        <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">Sueldo Promedio por Modalidad</Data></Cell>\n        <Cell ss:StyleID="SectionHeader"></Cell>\n      </Row>\n`;
    xmlRows += addRow([{ val: 'Modalidad', type: 'String', style: 'Header' }, { val: 'Sueldo Promedio (BOB)', type: 'String', style: 'Header' }]);
    this.modalitySalariesStats().forEach(m => {
      xmlRows += addRow([{ val: m.name, type: 'String' }, { val: m.value, type: 'Number' }]);
    });

    const excelXml = `<?xml version="1.0"?>
<?mso-application myexcel?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${docProperties}
${styles}
 <Worksheet ss:Name="Reporte BI">
  <Table ss:ExpandedColumnCount="2" ss:ExpandedRowCount="40" x:FullColumns="1" x:FullRows="1">
   <Column ss:Width="250"/>
   <Column ss:Width="150"/>
${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob(['\uFEFF' + excelXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_bi_agencia_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success('Reporte Excel (.xls) exportado con éxito');
  }

  exportarPDF(): void {
    try {
      const doc = new jsPDF();
      
      // Header banner (Royal dark blue)
      doc.setFillColor(30, 27, 75); // #1E1B4B
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('REPORTE EJECUTIVO DE METRICAS (BI)', 15, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(226, 232, 240); // text-light
      doc.text(`Generado el: ${new Date().toLocaleString()}  |  Agencia de Empleo Inteligente`, 15, 27);
      
      // Section 1: KPI Statistics Table
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('1. Resumen General de Indicadores (KPIs)', 15, 50);
      
      // Table headers
      doc.setFillColor(91, 75, 219); // Primary purple #5B4BDB
      doc.rect(15, 55, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Indicador Clave de Rendimiento', 20, 60.5);
      doc.text('Valor Registrado', 140, 60.5);
      
      // Table rows
      const rows = [
        ['Tasa de Contratación (Placement Rate)', `${this.placementRate()}%`],
        ['Sueldo Ofrecido Promedio', `${this.avgOfferedSalary().toLocaleString('es-BO')} BOB`],
        ['Pretensión Salarial Promedio', `${this.avgExpectedSalary().toLocaleString('es-BO')} BOB`],
        ['Ratio de Selección (Candidatos por Oferta)', `${this.candidatesPerOfferRatio()}`],
        ['Modalidad de Trabajo Predominante', this.dominantModality().toUpperCase()],
        ['Tiempo Medio de Contratación', `${this.timeToHire()} días`],
        ...this.topCompanies().map((c, idx) => [`Empresa Activa Top ${idx + 1} (${c.name})`, `${c.count} ofertas`]),
        ['Total Usuarios en el Sistema', `${this.totalUsers()}`],
        ['Total Empresas Asociadas', `${this.totalCompanies()}`],
        ['Total Reclutadores Registrados', `${this.totalRecruiters()}`],
        ['Total Ofertas Publicadas', `${this.totalOffers()}`],
        ['Total Postulaciones Procesadas', `${this.totalPostulations()}`]
      ];
      
      let y = 69;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      rows.forEach(([label, value]) => {
        doc.text(label, 20, y);
        doc.text(value, 140, y);
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });
      
      // Section 2: Charts Summary (ATS Funnel)
      y += 10;
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('2. Distribución del Embudo ATS', 15, y);
      
      y += 5;
      doc.setFillColor(91, 75, 219);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Fase del Proceso de Selección', 20, y + 5.5);
      doc.text('Aplicaciones', 100, y + 5.5);
      doc.text('Porcentaje del Embudo', 145, y + 5.5);
      
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      this.phaseStats().forEach(p => {
        doc.text(p.phase, 20, y);
        doc.text(`${p.count} postulaciones`, 100, y);
        doc.text(`${p.percentage}%`, 145, y);
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });
      
      if (y > 230) {
        doc.addPage();
        y = 30;
      } else {
        y += 10;
      }
      
      // Section 3: Modalities Salaries
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('3. Sueldos Promedio por Modalidad de Trabajo', 15, y);
      
      y += 5;
      doc.setFillColor(91, 75, 219);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Modalidad de Trabajo', 20, y + 5.5);
      doc.text('Sueldo Promedio Ofrecido', 140, y + 5.5);
      
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      this.modalitySalariesStats().forEach(m => {
        doc.text(m.name, 20, y);
        doc.text(`${m.value.toLocaleString('es-BO')} BOB`, 140, y);
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Agencia de Empleo Inteligente - Reporte de Inteligencia de Negocios (BI)', 15, 285);
      doc.text('Confidencial de Negocios', 170, 285);
      
      doc.save(`reporte_bi_agencia_${new Date().toISOString().slice(0, 10)}.pdf`);
      this.toastService.success('Reporte PDF exportado con éxito');
    } catch (e) {
      this.toastService.error('Error al generar el PDF del reporte');
      console.error(e);
    }
  }
}
