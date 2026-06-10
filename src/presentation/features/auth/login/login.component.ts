import { Component, ElementRef, ViewChild, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  // Inputs and state signals
  readonly activeTab = signal<'password' | 'biometric'>('password');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  
  // Camera state
  readonly isCameraActive = signal<boolean>(false);
  private stream: MediaStream | null = null;

  ngOnDestroy(): void {
    this.stopCamera();
  }

  setTab(tab: 'password' | 'biometric'): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    if (tab !== 'biometric') {
      this.stopCamera();
    }
  }

  onEmailChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.email.set(value);
  }

  onPasswordChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.password.set(value);
  }

  onPasswordSubmit(event: Event): void {
    event.preventDefault();
    if (!this.email() || !this.password()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithPassword(this.email(), this.password()).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.toastService.success(`¡Bienvenido de nuevo, ${user.nombre}!`);
        this.redirectUser(user.rol);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Credenciales incorrectas');
        this.toastService.error('Error de autenticación');
      }
    });
  }

  async startCamera(): Promise<void> {
    this.errorMessage.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: 'user' }
      });
      this.isCameraActive.set(true);
      
      // Allow DOM to render video element before assigning stream
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
        }
      }, 50);
    } catch (err) {
      this.errorMessage.set('No se pudo acceder a la cámara. Por favor verifica los permisos.');
      this.toastService.error('Error al iniciar cámara');
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.isCameraActive.set(false);
  }

  captureAndLogin(): void {
    if (!this.email()) {
      this.errorMessage.set('Por favor ingresa tu correo antes de capturar el rostro.');
      return;
    }
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Capture current frame from video
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Extract base64 image data
    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64Data = dataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithImage(this.email(), base64Data).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.stopCamera();
        this.toastService.success(`¡Acceso verificado! Bienvenido, ${user.nombre}`);
        this.redirectUser(user.rol);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Autenticación biométrica fallida');
        this.toastService.error('Biometría facial no válida');
      }
    });
  }

  private redirectUser(rol: 'administrador' | 'reclutador'): void {
    if (rol === 'administrador') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/reclutador']);
    }
  }
}
