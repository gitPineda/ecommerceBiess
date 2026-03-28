# Biess Commerce White Label

Aplicacion movil de comercio electronico construida con React Native + Expo SDK 55, lista para evolucionar desde datos mock hacia una API real o Supabase.

## Requisitos

- Node.js 20.19 o superior
- npm 10 o superior

## Instalacion

```bash
npm install
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
npx expo start
```

## Credenciales demo

- Administrador: `admin` / `Admin123*`
- Cliente: `cliente` / `Cliente123*`

## Estructura

- `src/components`: componentes reutilizables
- `src/screens`: pantallas por dominio
- `src/navigation`: stacks y tabs
- `src/services`: mock services y punto de integracion futuro
- `src/store`: estado global con Context + reducer
- `src/theme`: tokens visuales
- `src/config`: configuracion white-label y entorno
- `src/data`: archivos JSON que simulan la API
- `assets`: iconos y logotipo base

## White-label

La identidad visual y de marca se centraliza en:

- `src/config/brand.json`
- `src/config/brandAssets.js`
- `src/theme/*`

Con esos archivos puedes cambiar nombre, slug, colores, mensajes y logotipo sin tocar la logica principal.
