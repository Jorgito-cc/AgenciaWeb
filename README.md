# Plataforma Web - AgenciaWeb

Este proyecto es la aplicacion web de la plataforma de reclutamiento, desarrollada con Angular y TypeScript. La plataforma incluye un portal publico, un panel de administracion para el Administrador y un panel de control para los Reclutadores.

## Arquitectura de Integracion

La aplicacion web utiliza un servicio centralizado de GraphQL (GraphQLService) para comunicarse con tres backends especializados segun el tipo de operacion:

* FastAPI (Python): Gestiona la autenticacion de usuarios y los modelos de biometria facial para la validacion de candidatos.
* Spring Boot (Java): Procesa la logica de negocio principal (gestion de vacantes, postulaciones y perfiles de usuario) y almacena los datos transaccionales en DynamoDB.
* NestJS (Node.js): Administra la subida y descarga de archivos seguros en Amazon S3, asi como la generacion de logs de auditoria del sistema.

## Rutas y Modulos del Sistema

El sistema esta organizado en tres modulos principales de navegacion configurados en app.routes.ts:

### Portal Publico (PublicLayoutComponent)

Rutas accesibles para todos los usuarios visitantes:

* /: Pagina de inicio (Landing) con presentacion de la plataforma.
* /login: Formulario de inicio de sesion para usuarios administrativos (Administrador y Reclutador).
* /empleos: Informacion sobre las ofertas laborales disponibles.
* /empresas: Portal de informacion corporativa y alianzas comerciales.
* /recursos: Recursos educativos, guias y ayuda para usuarios.
* /sobre-nosotros: Informacion acerca de la mision y vision de la agencia.

### Panel de Administracion (admin)

Espacio privado protegido por guards de autenticacion y rol especifico para el Administrador (/admin):

* /admin/dashboard: Estadisticas generales del sistema y control global.
* /admin/usuarios: Administracion completa de cuentas de usuario.
* /admin/empresas: Registro y mantenimiento de empresas asociadas.
* /admin/metadata: Configuracion de parametros y metadata del sistema.
* /admin/reclutadores: Altas, bajas y modificaciones de cuentas de reclutadores.
* /admin/candidatos: Gestion y visualizacion de perfiles de candidatos.
* /admin/auditoria: Registro de eventos de auditoria y control legal.
* /admin/trabajos: Monitoreo global de ofertas laborales publicadas.
* /admin/soporte: Gestion de solicitudes de soporte tecnico.

### Panel del Reclutador (reclutador)

Espacio privado exclusivo para usuarios con el rol de Reclutador (/reclutador):

* /reclutador/dashboard: Panel de control con resumen de sus procesos activos.
* /reclutador/ofertas: Creacion, edicion y publicacion de nuevas ofertas de empleo.
* /reclutador/categorias: Gestion de las categorias o sectores de trabajo.
* /reclutador/postulaciones: Revisión de candidatos postulados y seguimiento de sus estados en el flujo de seleccion (pipeline).
* /reclutador/soporte: Acceso a soporte tecnico especializado.

## Estructura de Directorios

Dentro de src, el codigo se estructura de la siguiente manera:

* src/app: Configuracion de rutas globales (app.routes.ts), configuracion del framework (app.config.ts) y componente raiz.
* src/core/guards: Protecciones de rutas por token y roles de usuario.
* src/core/services: Servicios compartidos como GraphQLService (comunicacion con backends), AuthService, ThemeService y ToastService.
* src/presentation/features: Componentes de vistas de la aplicacion organizados por funcionalidades (auth, admin-dashboard, recruiter-dashboard, shared).
* src/presentation/layout: Estructuras visuales globales y barras de navegacion (LayoutComponent para paneles protegidos y PublicLayoutComponent para el portal publico).
* src/styles.css: Archivo de estilos CSS global de la aplicacion.

## Requisitos de Ejecucion

Para correr la aplicacion web localmente:

* Node.js (version compatible con Angular v20)
* Angular CLI instalado de forma global o mediante npx

## Instalacion y Puesta en Marcha

1. Instalar las dependencias de node_modules:
   npm install

2. Iniciar el servidor de desarrollo local:
   npm start

   El servidor iniciara por defecto en http://localhost:4200/.

3. Construir para produccion:
   npm run build

   Los archivos resultantes se generaran optimizados dentro del directorio /dist.

## Seguridad y Variables de Entorno

El archivo .gitignore se encuentra configurado para excluir archivos de configuracion local y de entorno como .env, .env.local, o *.env. Cualquier credencial, clave de API o URL sensible debe configurarse de manera local y no debe subirse al control de versiones.
