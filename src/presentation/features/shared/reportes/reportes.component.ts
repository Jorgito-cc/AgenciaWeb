import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { GraphQLService } from '../../../../core/services/graphql.service';
import { ToastService } from '../../../../core/services/toast.service';
import { jsPDF } from 'jspdf';

// Definir interfaz para reconocimiento de voz
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesDinamicosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly gqlService = inject(GraphQLService);
  private readonly toastService = inject(ToastService);

  // Schema state
  readonly schema = signal<Record<string, string[]>>({});
  readonly tables = computed(() => Object.keys(this.schema()));

  // Active Query state
  readonly selectedTable = signal<string>('');
  readonly selectedFields = signal<Record<string, boolean>>({});
  readonly promptText = signal<string>('');
  readonly isListening = signal<boolean>(false);

  // Result state
  readonly isLoading = signal<boolean>(false);
  readonly queryResults = signal<any[]>([]);
  readonly resultColumns = signal<string[]>([]);

  // Speech Recognition Object
  private recognition: any;

  // Derive URLs from GraphQLService
  private getSpringBaseUrl(): string {
    // @ts-ignore
    const gqlUrl = this.gqlService.SPRINGBOOT_URL || 'https://sprintboot.jorgechoquecalle.engineer/graphql';
    return gqlUrl.replace('/graphql', '');
  }

  private getFastApiBaseUrl(): string {
    // @ts-ignore
    const gqlUrl = this.gqlService.FASTAPI_URL || 'https://python.erikaguilarchuviru.dev/graphql';
    return gqlUrl.replace('/graphql', '');
  }

  ngOnInit(): void {
    this.loadSchema();
    this.initSpeechRecognition();
  }

  loadSchema(): void {
    const url = `${this.getSpringBaseUrl()}/api/reportes/schema`;
    this.http.get<Record<string, string[]>>(url).subscribe({
      next: (data) => {
        this.schema.set(data);
        if (this.tables().length > 0) {
          this.selectTable(this.tables()[0]);
        }
      },
      error: () => this.toastService.error('Error al cargar esquema de tablas')
    });
  }

  selectTable(table: string): void {
    this.selectedTable.set(table);
    const fieldsMap: Record<string, boolean> = {};
    const fields = this.schema()[table] || [];
    fields.forEach(f => {
      fieldsMap[f] = f !== 'id';
    });
    this.selectedFields.set(fieldsMap);
  }

  toggleField(field: string): void {
    const current = this.selectedFields();
    current[field] = !current[field];
    this.selectedFields.set({ ...current });
  }

  // Speech Recognition integration
  initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'es-BO';
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.toastService.error('Error al escuchar el micrófono: ' + event.error);
        this.isListening.set(false);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        this.promptText.set(transcript);
        this.toastService.info('Comando escuchado: "' + transcript + '"');
        this.enviarPrompt();
      };
    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }
  }

  toggleListening(): void {
    if (!this.recognition) {
      this.toastService.warning('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome/Edge.');
      return;
    }

    if (this.isListening()) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  // Parse prompt via FastAPI
  enviarPrompt(): void {
    const prompt = this.promptText().trim();
    if (!prompt) return;

    this.isLoading.set(true);
    const url = `${this.getFastApiBaseUrl()}/api/reportes/parse-prompt`;

    this.http.post<any>(url, { prompt }).subscribe({
      next: (res) => {
        this.selectedTable.set(res.table);
        
        const fieldsMap: Record<string, boolean> = {};
        const availableFields = this.schema()[res.table] || [];
        availableFields.forEach(f => {
          fieldsMap[f] = res.fields.includes(f);
        });
        this.selectedFields.set(fieldsMap);

        this.toastService.success(`IA detectó reporte de ${res.table}`);
        this.ejecutarQuery(res.filters);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Error al procesar comando por IA');
      }
    });
  }

  ejecutarQueryManual(): void {
    this.ejecutarQuery([]);
  }

  ejecutarQuery(filters: any[] = []): void {
    const table = this.selectedTable();
    if (!table) return;

    this.isLoading.set(true);
    const fields = Object.entries(this.selectedFields())
      .filter(([_, checked]) => checked)
      .map(([name]) => name);

    if (fields.length === 0) {
      this.isLoading.set(false);
      this.toastService.warning('Selecciona al menos una columna para mostrar');
      return;
    }

    const url = `${this.getSpringBaseUrl()}/api/reportes/ejecutar`;
    this.http.post<any[]>(url, { table, fields, filters }).subscribe({
      next: (data) => {
        this.queryResults.set(data);
        this.resultColumns.set(fields);
        this.isLoading.set(false);
        this.toastService.success(`Reporte generado con ${data.length} registros`);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errMsg = err.error?.error || 'Error al obtener datos';
        this.toastService.error(errMsg);
      }
    });
  }

  exportarPDF(): void {
    const data = this.queryResults();
    const cols = this.resultColumns();
    if (data.length === 0) {
      this.toastService.warning('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, 297, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`REPORTE DINÁMICO: ${this.selectedTable().toUpperCase()}`, 15, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 230, 16);

    let y = 35;
    const colWidth = 270 / cols.length;

    doc.setFillColor(91, 75, 219);
    doc.rect(15, y, 270, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    cols.forEach((col, idx) => {
      doc.text(col.toUpperCase(), 17 + idx * colWidth, y + 5.5);
    });

    y += 13;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);

    data.forEach((row) => {
      if (y > 185) {
        doc.addPage('a4', 'l');
        y = 20;
        
        doc.setFillColor(91, 75, 219);
        doc.rect(15, y, 270, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        cols.forEach((col, idx) => {
          doc.text(col.toUpperCase(), 17 + idx * colWidth, y + 5.5);
        });
        y += 13;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
      }

      cols.forEach((col, idx) => {
        const val = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
        doc.text(val, 17 + idx * colWidth, y);
      });

      doc.setDrawColor(229, 231, 235);
      doc.line(15, y + 2, 285, y + 2);
      y += 8;
    });

    doc.save(`reporte_${this.selectedTable().toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.toastService.success('Reporte exportado a PDF con éxito.');
  }

  exportarExcel(): void {
    const data = this.queryResults();
    const cols = this.resultColumns();
    if (data.length === 0) return;

    let csvContent = '\uFEFF';
    csvContent += cols.join(';') + '\n';

    data.forEach((row) => {
      const line = cols.map(col => {
        const val = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += line.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${this.selectedTable().toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success('Reporte exportado a CSV/Excel.');
  }

  exportarHTML(): void {
    const data = this.queryResults();
    const cols = this.resultColumns();
    if (data.length === 0) return;

    let htmlContent = `
      <html>
      <head>
        <title>Reporte de ${this.selectedTable()}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { color: #1e1b4b; margin-bottom: 5px; }
          .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #5b4bdb; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Reporte de ${this.selectedTable()}</h1>
        <div class="meta">Generado el: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>${cols.map(c => `<th>${c.toUpperCase()}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>${cols.map(c => `<td>${row[c] !== null && row[c] !== undefined ? row[c] : ''}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const windowTab = window.open(url, '_blank');
    if (windowTab) {
      this.toastService.success('Pestaña de impresión HTML abierta.');
    }
  }
}
