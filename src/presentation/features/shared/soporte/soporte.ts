import { Component } from '@angular/core';

interface TeamMember {
  id: string;
  name: string;
  reg: string;
  roleType: string;
  description: string;
  phone: string;
  image: string;
}

@Component({
  selector: 'app-soporte',
  standalone: true,
  templateUrl: './soporte.html',
  styleUrl: './soporte.css'
})
export class Soporte {
  readonly team: TeamMember[] = [
    {
      id: '1',
      name: 'AGUILAR CHUVIRU ERIK',
      reg: '221043411',
      roleType: 'Backend Developer',
      description: 'Experto en Machine Learning, FastAPI y NestJS. Estudiante de Ingeniería de Sistemas - UAGRM.',
      phone: '+591 78178467',
      image: '/hero.png'
    },
    {
      id: '2',
      name: 'CHOQUE CALLE JORGE',
      reg: '219074240',
      roleType: 'Frontend Developer',
      description: 'Experto en desarrollo Web y Móvil (React Native, Angular). Estudiante de Ingeniería de Sistemas - UAGRM.',
      phone: '+591 75568684',
      image: '/jorge.jpeg'
    },
    {
      id: '3',
      name: 'CHOQUE VILLCA GROVER',
      reg: '219213100',
      roleType: 'Backend Developer',
      description: 'Experto en Spring Boot y arquitecturas empresariales. Estudiante de Ingeniería de Sistemas - UAGRM.',
      phone: '+591 78023575',
      image: '/grover.png'
    }
  ];
}
