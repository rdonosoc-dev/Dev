# 🏆 Tournament Manager - Multi-Torneos con Roles

Aplicación web para crear y gestionar **múltiples torneos** con control de acceso por roles: **Administrador** (gestión completa) y **Usuario/Consulta** (solo lectura).

## 👤 Roles de Usuario

### 👤 Administrador
- ✅ Crear nuevos torneos (con Club, Deporte, Jugadores esperados, Fecha)
- ✅ Agregar/eliminar jugadores
- ✅ Generar brackets con seeding automático
- ✅ Registrar y modificar resultados de partidos
- ✅ Reiniciar brackets
- ✅ Eliminar torneos
- ✅ Exportar datos
- ✅ Ver todo (dashboard, brackets, estadísticas)

### 👥 Usuario / Consulta
- ✅ Ver lista de todos los torneos
- ✅ Ver jugadores de cada torneo
- ✅ Ver brackets (sin poder editar)
- ✅ Ver resultados y estadísticas
- ❌ No puede crear torneos
- ❌ No puede agregar/eliminar jugadores
- ❌ No puede registrar resultados
- ❌ No puede eliminar nada

## ✨ Funcionalidades

### 🔐 Login por Roles
- Pantalla de inicio con selección de perfil
- Persistencia de sesión en localStorage
- Badge visual del rol actual
- Botón de logout

### 🏠 Dashboard de Torneos
- Tarjetas visuales por torneo
- Filtro por estado: En preparación / En progreso / Finalizado
- Stats: jugadores, partidos, progreso %
- Eliminación (solo admin)

### ➕ Crear Torneo (Admin)
- **Nombre del Torneo**
- **Club / Organización** (campo principal)
- **Deporte / Disciplina**
- **Cantidad esperada de jugadores** (referencia)
- **Fecha**
- **Formato** (Single Elimination)

### 🏆 Bracket con Seeding Oficial
- **Cabeceras**: distribución estratégica por ranking
- **Snake**: #1 vs último, #2 vs penúltimo
- **Byes automáticos**: mejores rankeados avanzan
- **Balanceo**: #1 y #2 solo en final
- Soporta 2, 4, 8, 16, 32, 64 jugadores

## 🚀 Cómo usar

### Como Administrador
1. Selecciona **"👤 Administrador"** en el login
2. Crea torneos con el botón **"➕ Nuevo Torneo"**
3. Dentro del torneo, agrega jugadores con ranking
4. Click en **"🚀 Generar Bracket"**
5. Click en los partidos para registrar resultados
6. Ve a **"📊 Resultados"** para ver clasificación

### Como Usuario/Consulta
1. Selecciona **"👥 Usuario / Consulta"** en el login
2. Verás todos los torneos creados
3. Click en cualquier torneo para ver detalles
4. Navega entre Jugadores, Bracket y Resultados
5. Todo es solo lectura, no puedes modificar nada

## 📁 Estructura

```
tournament-app/
├── index.html      # Login + SPA con 5 vistas
├── styles.css      # Estilos + login + roles
├── app.js          # Lógica multi-torneos + roles (~49KB)
├── .nojekyll       # Config GitHub Pages
└── README.md
```

## 🛠️ Tecnologías

- HTML5, CSS3, Vanilla JavaScript (ES6+)
- LocalStorage API (persistencia datos + sesión)
- Sin dependencias externas
- Sin backend requerido

## 🔮 Roadmap

- [ ] Contraseña para admin
- [ ] Múltiples admins
- [ ] Double Elimination / Round Robin
- [ ] Compartir bracket vía URL pública
- [ ] Backend con autenticación real
