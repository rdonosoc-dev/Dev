/* ============================================================
   TOURNAMENT MANAGER - MULTI-TOURNAMENT APP CON ROLES
   Roles: admin (gestión completa) | viewer (solo lectura)
   Backend: Firebase Firestore (free tier)
   ============================================================ */

// ── Firebase setup ──────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqb7iWy2tVg8CrahupuBQpGM19eXSaedU",
  authDomain: "torneos-admin.firebaseapp.com",
  projectId: "torneos-admin",
  storageBucket: "torneos-admin.firebasestorage.app",
  messagingSenderId: "55613701770",
  appId: "1:55613701770:web:70734984b8a4b3d5927773",
  measurementId: "G-27FWLK4W1Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ───────────────────────────────────────────────────────────

class TournamentApp {
    constructor() {
        this.tournaments = [];
        this.currentTournamentId = null;
        this.currentUser = null;
        this.tournamentToDelete = null;
        this.currentMatch = null;

        this.init().catch(e => console.error('Init error:', e));
    }

    // ============================================================
    // AUTH / ROLES
    // ============================================================
    async init() {
        // Show loading overlay while data loads
        this._showLoadingOverlay(true);

        await this.loadData();
        this._showLoadingOverlay(false);

        // Check if user is already logged in
        const savedUser = localStorage.getItem('tournament_user_role');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainApp();
        } else {
            this.showLoginScreen();
        }

        this.bindEvents();

        // Set default date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('tournament-date');
        if (dateInput) dateInput.value = today;
    }

    _showLoadingOverlay(show) {
        let el = document.getElementById('loading-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'loading-overlay';
            el.className = 'loading-overlay';
            el.innerHTML = `
                <div class="loading-card">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Cargando torneos...</div>
                </div>`;
            document.body.appendChild(el);
        }
        el.style.display = show ? 'flex' : 'none';
    }

    login(role) {
        this.currentUser = {
            role: role,
            name: role === 'admin' ? 'Administrador' : 'Usuario',
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('tournament_user_role', JSON.stringify(this.currentUser));

        this.showToast(`Bienvenido, ${this.currentUser.name}`, 'success');
        this.showMainApp();
    }

    logout() {
        this.currentUser = null;
        this.currentTournamentId = null;
        localStorage.removeItem('tournament_user_role');

        // Reset all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-tournaments').classList.add('active');

        this.showLoginScreen();
        this.showToast('Sesión cerrada', 'info');
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';

        this.applyRoleUI();
        this.switchMainView('tournaments');

        // Show setup banner only for admin when Firebase not configured
        const notConfigured = !db || firebaseConfig.projectId === 'REPLACE_WITH_YOUR_PROJECT_ID';
        const bannerId = 'firebase-setup-banner';
        let banner = document.getElementById(bannerId);

        if (notConfigured && this.isAdmin()) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = bannerId;
                banner.className = 'setup-banner';
                banner.innerHTML = `
                    <div class="setup-banner-icon">
                        <svg width="18" height="18"><use href="#ic-alert"/></svg>
                    </div>
                    <div class="setup-banner-text">
                        <div class="setup-banner-title">Modo local — datos guardados en este navegador</div>
                        <div class="setup-banner-desc">
                            Para activar la nube: configura Firebase en <code>app.js</code> (líneas con REPLACE_WITH_YOUR...).
                            <a href="https://console.firebase.google.com" target="_blank">Ir a Firebase Console →</a>
                        </div>
                    </div>
                    <button onclick="document.getElementById('${bannerId}').remove()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);padding:4px;flex-shrink:0;">
                        <svg width="16" height="16"><use href="#ic-x"/></svg>
                    </button>`;
                // Insert after header, before main
                const main = document.querySelector('.main');
                if (main) main.parentNode.insertBefore(banner, main);
            }
        } else if (banner) {
            banner.remove();
        }
    }

    applyRoleUI() {
        const isAdmin = this.isAdmin();
        const appContainer = document.getElementById('app');

        // Update role badge
        const badge = document.getElementById('current-role-badge');
        if (badge) {
            if (isAdmin) {
                badge.innerHTML = '<svg width="11" height="11"><use href="#ic-shield"/></svg> Admin';
                badge.className = 'role-badge';
            } else {
                badge.innerHTML = '<svg width="11" height="11"><use href="#ic-eye"/></svg> Consulta';
                badge.className = 'role-badge viewer';
            }
        }

        // Toggle viewer-mode class on body/app for CSS rules
        if (!isAdmin) {
            appContainer.classList.add('viewer-mode');
        } else {
            appContainer.classList.remove('viewer-mode');
        }

        // Update subtitles for viewers
        const tournamentsSubtitle = document.getElementById('tournaments-subtitle');
        if (tournamentsSubtitle) {
            tournamentsSubtitle.textContent = isAdmin 
                ? 'Gestiona todos tus torneos por club.'
                : 'Consulta todos los torneos disponibles.';
        }

        const emptyText = document.getElementById('empty-tournaments-text');
        if (emptyText) {
            emptyText.textContent = isAdmin
                ? 'Los torneos aparecerán aquí cuando los crees.'
                : 'No hay torneos disponibles para consulta.';
        }

        const playersSubtitle = document.getElementById('players-subtitle');
        if (playersSubtitle) {
            playersSubtitle.textContent = isAdmin
                ? 'Agrega jugadores con su ranking. El sistema distribuirá las cabeceras automáticamente.'
                : 'Lista de jugadores inscritos en el torneo.';
        }

        const bracketSubtitle = document.getElementById('bracket-subtitle');
        if (bracketSubtitle) {
            bracketSubtitle.textContent = isAdmin
                ? 'Las cabeceras (seeds) se distribuyen automáticamente según el ranking. Click para registrar resultados.'
                : 'Visualización del bracket del torneo.';
        }

        const bracketEmptyText = document.getElementById('bracket-empty-text');
        if (bracketEmptyText) {
            bracketEmptyText.textContent = isAdmin
                ? 'El bracket aparecerá aquí cuando se genere.'
                : 'El bracket aparecerá aquí cuando el administrador lo genere.';
        }

        // Show/hide "New Tournament" nav tab
        const newTournamentNav = document.getElementById('nav-new-tournament');
        if (newTournamentNav) {
            newTournamentNav.style.display = isAdmin ? '' : 'none';
        }
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isViewer() {
        return this.currentUser && this.currentUser.role === 'viewer';
    }

    checkAdmin(actionName) {
        if (!this.isAdmin()) {
            this.showToast('Solo administradores: ' + actionName, 'error');
            return false;
        }
        return true;
    }

    // ============================================================
    // DATA PERSISTENCE — Firebase Firestore with localStorage fallback
    // ============================================================
    async loadData() {
        const isFirebaseReady = db && firebaseConfig.projectId !== 'REPLACE_WITH_YOUR_PROJECT_ID';

        if (isFirebaseReady) {
            try {
                this._showDbStatus('loading');
                const snap = await getDocs(collection(db, 'tournaments'));
                this.tournaments = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                this._showDbStatus('ok');
            } catch(e) {
                console.error('Firestore read error:', e);
                this._loadFromLocalStorage();
                this._showDbStatus('error');
            }
        } else {
            this._loadFromLocalStorage();
        }
    }

    _loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('tournament_manager_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.tournaments = data.tournaments || [];
            }
        } catch(e) { console.error('localStorage read error:', e); }
    }

    // Always-safe save: localStorage first, Firestore if configured
    _saveTournament(tournament) {
        // 1. Always persist to localStorage immediately (sync, never fails)
        try {
            localStorage.setItem('tournament_manager_data', JSON.stringify({
                tournaments: this.tournaments,
                version: '4.0'
            }));
        } catch(e) {
            console.error('localStorage write error:', e);
        }

        // 2. Optionally sync to Firestore in the background
        const isFirebaseReady = db && firebaseConfig.projectId !== 'REPLACE_WITH_YOUR_PROJECT_ID';
        if (isFirebaseReady) {
            try {
                const ref = doc(db, 'tournaments', tournament.id);
                const data = JSON.parse(JSON.stringify(tournament));
                data.updatedAt = new Date().toISOString();
                setDoc(ref, data).catch(e => {
                    console.error('Firestore background save error:', e);
                });
            } catch(e) {
                console.error('Firestore save setup error:', e);
            }
        }
    }

    // Delete: localStorage first, Firestore if configured
    _deleteTournament(tournamentId) {
        try {
            localStorage.setItem('tournament_manager_data', JSON.stringify({
                tournaments: this.tournaments,
                version: '4.0'
            }));
        } catch(e) {}

        const isFirebaseReady = db && firebaseConfig.projectId !== 'REPLACE_WITH_YOUR_PROJECT_ID';
        if (isFirebaseReady) {
            deleteDoc(doc(db, 'tournaments', tournamentId)).catch(e => {
                console.error('Firestore delete error:', e);
            });
        }
    }

    _showDbStatus(status) {
        let el = document.getElementById('db-status');
        if (!el) {
            el = document.createElement('div');
            el.id = 'db-status';
            el.className = 'db-status';
            document.getElementById('app').appendChild(el);
        }
        const map = {
            loading: { cls: 'db-loading', html: '<span class="db-dot"></span> Cargando datos...' },
            ok:      { cls: 'db-ok',      html: '<span class="db-dot"></span> Firestore' },
            error:   { cls: 'db-error',   html: '<span class="db-dot"></span> Sin conexión (modo local)' },
        };
        const s = map[status] || map.ok;
        el.className = 'db-status ' + s.cls;
        el.innerHTML = s.html;
        if (status === 'ok') setTimeout(() => { if(el) el.style.opacity = '0'; }, 3000);
        else el.style.opacity = '1';
    }

    getCurrentTournament() {
        return this.tournaments.find(t => t.id === this.currentTournamentId);
    }

    _bindSetsPicker(containerId, hiddenInputId) {
        const container = document.getElementById(containerId);
        const hidden = document.getElementById(hiddenInputId);
        if (!container || !hidden) return;
        container.querySelectorAll('.sets-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.sets-pick-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                hidden.value = btn.dataset.sets;
            });
        });
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    bindEvents() {
        // Main nav tabs
        document.querySelectorAll('#main-nav .nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) this.switchMainView(view);
            });
        });

        // Tournament nav tabs
        document.querySelectorAll('#tournament-nav .nav-tab[data-view]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) this.switchTournamentView(view);
            });
        });

        // Create tournament
        const createBtn = document.getElementById('create-tournament-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createTournament());
        }

        // Add player
        const addPlayerBtn = document.getElementById('add-player');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.addPlayer());
        }

        const playerNameInput = document.getElementById('player-name');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addPlayer();
            });
        }

        const playerRankingInput = document.getElementById('player-ranking');
        if (playerRankingInput) {
            playerRankingInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addPlayer();
            });
        }

        // Clear players
        const clearBtn = document.getElementById('clear-players');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearPlayers());
        }

        // Generate bracket
        const genBracketBtn = document.getElementById('generate-bracket-btn');
        if (genBracketBtn) {
            genBracketBtn.addEventListener('click', () => this.generateBracket());
        }

        // Bracket actions
        const resetBracketBtn = document.getElementById('reset-bracket');
        if (resetBracketBtn) {
            resetBracketBtn.addEventListener('click', () => this.resetBracket());
        }

        const exportBracketBtn = document.getElementById('export-bracket');
        if (exportBracketBtn) {
            exportBracketBtn.addEventListener('click', () => this.exportBracket());
        }

        // Match modal
        const modalOverlay = document.querySelector('#match-modal .modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }

        const modalClose = document.querySelector('#match-modal .modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        const modalCancel = document.getElementById('modal-cancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.closeModal());
        }

        const modalSave = document.getElementById('modal-save');
        if (modalSave) {
            modalSave.addEventListener('click', () => this.saveMatchResult());
        }

        // Score inputs
        const score1 = document.getElementById('score1');
        if (score1) {
            score1.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const score2 = document.getElementById('score2');
                    if (score2) score2.focus();
                }
            });
        }

        const score2 = document.getElementById('score2');
        if (score2) {
            score2.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveMatchResult();
            });
        }

        // Delete modal
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteTournament());
        }
    }

    switchMainView(viewName) {
        // Admin check for new-tournament view
        if (viewName === 'new-tournament' && !this.isAdmin()) {
            this.showToast('Solo el administrador puede crear torneos', 'error');
            return;
        }

        document.querySelectorAll('#main-nav .nav-tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`#main-nav .nav-tab[data-view="${viewName}"]`);
        if (tab) tab.classList.add('active');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(`view-${viewName}`);
        if (view) view.classList.add('active');

        if (viewName === 'tournaments') this.renderTournaments();
    }

    switchTournamentView(viewName) {
        document.querySelectorAll('#tournament-nav .nav-tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`#tournament-nav .nav-tab[data-view="${viewName}"]`);
        if (tab) tab.classList.add('active');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(`view-${viewName}`);
        if (view) view.classList.add('active');

        if (viewName === 'players') {
            this.renderPlayers();
            this.updatePlayerStats();
        }
        if (viewName === 'bracket') this.renderBracket();
        if (viewName === 'results') this.renderResults();
    }

    goHome() {
        this.currentTournamentId = null;
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('tournament-nav').style.display = 'none';
        this.switchMainView('tournaments');
    }

    openTournament(tournamentId) {
        this.currentTournamentId = tournamentId;
        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        this.updateBanners(tournament);
        this.applyRoleUI(); // Re-apply role UI for tournament context

        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('tournament-nav').style.display = 'flex';

        this.switchTournamentView('players');
    }

    updateBanners(tournament) {
        const status = this.getTournamentStatus(tournament);
        const statusClass = status === 'completed' ? 'status-completed' : 
                           status === 'in-progress' ? 'status-in-progress' : 'status-preparing';
        const statusText = status === 'completed' ? 'Finalizado' : 
                          status === 'in-progress' ? 'En progreso' : 'En preparación';

        const banners = ['players', 'bracket', 'results'];
        banners.forEach(type => {
            const nameEl = document.getElementById(`${type}-tournament-name`);
            const clubEl = document.getElementById(`${type}-club`);
            const statusEl = document.getElementById(`${type}-status`);

            if (nameEl) nameEl.textContent = tournament.name;
            if (clubEl) clubEl.textContent = tournament.club;
            if (statusEl) {
                statusEl.textContent = statusText;
                statusEl.className = `badge ${statusClass}`;
            }
        });
    }

    getTournamentStatus(tournament) {
        if (!tournament.bracket) return 'preparing';
        const totalMatches = tournament.matches.length;
        const completedMatches = tournament.matches.filter(m => m.completed).length;
        if (completedMatches === 0) return 'preparing';
        if (completedMatches === totalMatches) return 'completed';
        return 'in-progress';
    }

    // ============================================================
    // TOURNAMENT MANAGEMENT (ADMIN ONLY)
    // ============================================================
    createTournament() {
        if (!this.checkAdmin('crear torneos')) return;

        const name = document.getElementById('tournament-name').value.trim();
        const club = document.getElementById('tournament-club').value.trim();
        const sport = document.getElementById('tournament-sport').value;
        const expectedPlayers = parseInt(document.getElementById('tournament-players-count').value) || null;
        const date = document.getElementById('tournament-date').value;
        const format = document.getElementById('tournament-format').value;
        const setsFormat = parseInt(document.getElementById('tournament-sets-format').value) || 1;

        if (!name) { this.showToast('Ingresa el nombre del torneo', 'error'); return; }
        if (!club) { this.showToast('Ingresa el club u organización', 'error'); return; }

        const tournament = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name, club,
            sport: sport || 'General',
            expectedPlayers,
            date, format,
            setsFormat,
            createdAt: new Date().toISOString(),
            players: [],
            bracket: null,
            matches: []
        };

        this.tournaments.push(tournament);
        this._saveTournament(tournament);

        // Clear form
        document.getElementById('tournament-name').value = '';
        document.getElementById('tournament-club').value = '';
        document.getElementById('tournament-sport').value = '';
        document.getElementById('tournament-players-count').value = '';
        document.getElementById('tournament-sets-format').value = '1';

        this.showToast(`Torneo "${name}" creado`, 'success');
        this.openTournament(tournament.id);
    }

    deleteTournament(tournamentId) {
        if (!this.checkAdmin('eliminar torneos')) return;

        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        this.tournamentToDelete = tournamentId;
        document.getElementById('delete-tournament-name').textContent = tournament.name;
        document.getElementById('delete-modal').classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('delete-modal').classList.remove('active');
        this.tournamentToDelete = null;
    }

    confirmDeleteTournament() {
        if (!this.tournamentToDelete) return;
        if (!this.isAdmin()) {
            this.showToast('Solo el administrador puede eliminar torneos', 'error');
            this.closeDeleteModal();
            return;
        }

        const id = this.tournamentToDelete;
        this.tournaments = this.tournaments.filter(t => t.id !== id);
        this._deleteTournament(id);
        // mirror to localStorage
        localStorage.setItem('tournament_manager_data', JSON.stringify({ tournaments: this.tournaments, version: '4.0' }));
        this.closeDeleteModal();
        this.renderTournaments();
        this.showToast('Torneo eliminado', 'warning');
    }

    renderTournaments() {
        const container = document.getElementById('tournaments-grid');
        const isAdmin = this.isAdmin();

        if (this.tournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon"><svg width="32" height="32"><use href="#ic-trophy"/></svg></div>
                    <h3>No hay torneos creados</h3>
                    <p>${isAdmin ? 'Crea tu primer torneo usando el botón "Nuevo Torneo"' : 'No hay torneos disponibles para consulta.'}</p>
                </div>
            `;
            return;
        }

        const sorted = [...this.tournaments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = '';

        // Add tournament card (admin only)
        if (isAdmin) {
            html += `
                <div class="add-tournament-card" onclick="app.switchMainView('new-tournament')">
                    <div class="add-tournament-icon"><svg width="28" height="28"><use href="#ic-plus"/></svg></div>
                    <div class="add-tournament-text">Crear Nuevo Torneo</div>
                </div>
            `;
        }

        sorted.forEach(tournament => {
            const status = this.getTournamentStatus(tournament);
            const statusClass = status === 'completed' ? 'status-completed' : 
                               status === 'in-progress' ? 'status-in-progress' : 'status-preparing';
            const statusText = status === 'completed' ? 'Finalizado' : 
                              status === 'in-progress' ? 'En progreso' : 'En preparación';

            const playerCount = tournament.players.length;
            const matchCount = tournament.matches.filter(m => m.completed).length;
            const totalMatches = tournament.matches.length;
            const progress = totalMatches > 0 ? Math.round((matchCount / totalMatches) * 100) : 0;

            const dateStr = tournament.date ? new Date(tournament.date).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric'
            }) : 'Sin fecha';

            html += `
                <div class="tournament-card" onclick="app.openTournament('${tournament.id}')">
                    <div class="tournament-card-header">
                        <div class="tournament-card-club"><svg width="11" height="11"><use href="#ic-building"/></svg> ${this.escapeHtml(tournament.club)}</div>
                        <div class="tournament-card-name">${this.escapeHtml(tournament.name)}</div>
                        <div class="tournament-card-sport">${this.escapeHtml(tournament.sport)}</div>
                    </div>
                    <div class="tournament-card-body">
                        <div class="tournament-stats">
                            <div class="tournament-stat">
                                <div class="tournament-stat-value">${playerCount}</div>
                                <div class="tournament-stat-label">Jugadores</div>
                            </div>
                            <div class="tournament-stat">
                                <div class="tournament-stat-value">${matchCount}/${totalMatches}</div>
                                <div class="tournament-stat-label">Partidos</div>
                            </div>
                            <div class="tournament-stat">
                                <div class="tournament-stat-value">${progress}%</div>
                                <div class="tournament-stat-label">Progreso</div>
                            </div>
                        </div>
                    </div>
                    <div class="tournament-card-footer">
                        <span class="tournament-date"><svg width="12" height="12" style="vertical-align:middle;margin-right:4px;color:var(--gray-400)"><use href="#ic-calendar"/></svg>${dateStr}</span>
                        <div class="tournament-actions" onclick="event.stopPropagation()">
                            <span class="status-badge ${statusClass}">
                                <span class="status-dot"></span>
                                ${statusText}
                            </span>
                            ${isAdmin ? `
                            <button class="btn-icon" onclick="event.stopPropagation(); app.openEditTournamentModal('${tournament.id}')" title="Editar torneo"><svg width="14" height="14"><use href="#ic-pencil"/></svg></button>
                            <button class="btn-icon delete" onclick="app.deleteTournament('${tournament.id}')" title="Eliminar"><svg width="14" height="14"><use href="#ic-trash"/></svg></button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ============================================================
    // PLAYERS MANAGEMENT (ADMIN ONLY for edits)
    // ============================================================
    addPlayer() {
        if (!this.checkAdmin('agregar jugadores')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const nameInput = document.getElementById('player-name');
        const rankingInput = document.getElementById('player-ranking');
        const pointsInput = document.getElementById('player-points');

        const name = nameInput.value.trim();
        const ranking = parseInt(rankingInput.value);
        const points = parseInt(pointsInput.value);

        if (!name) {
            this.showToast('Ingresa un nombre', 'error');
            return;
        }
        if (!ranking || ranking < 1) {
            this.showToast('Ingresa un ranking válido', 'error');
            return;
        }
        if (!points || points < 1) {
            this.showToast('Ingresa los puntos oficiales válidos', 'error');
            return;
        }
        if (tournament.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('Este jugador ya existe en el torneo', 'error');
            return;
        }

        const player = {
            id: Date.now() + Math.random(),
            name: name,
            ranking: ranking,
            points: points,
            createdAt: new Date().toISOString()
        };

        tournament.players.push(player);
        tournament.players.sort((a, b) => a.ranking - b.ranking);

        this._saveTournament(tournament);
        this.renderPlayers();
        this.updatePlayerStats();
        this.updateBanners(tournament);

        nameInput.value = '';
        rankingInput.value = '';
        pointsInput.value = '';
        nameInput.focus();

        this.showToast(`"${name}" agregado · ranking #${ranking}`, 'success');
    }

    removePlayer(id) {
        if (!this.checkAdmin('eliminar jugadores')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        tournament.players = tournament.players.filter(p => p.id !== id);
        this._saveTournament(tournament);
        this.renderPlayers();
        this.updatePlayerStats();
        this.showToast('Jugador eliminado', 'warning');
    }

    clearPlayers() {
        if (!this.checkAdmin('limpiar jugadores')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament || tournament.players.length === 0) return;
        if (!confirm('¿Eliminar todos los jugadores de este torneo?')) return;

        tournament.players = [];
        tournament.bracket = null;
        tournament.matches = [];
        this._saveTournament(tournament);
        this.renderPlayers();
        this.updatePlayerStats();
        this.showToast('Todos los jugadores eliminados', 'warning');
    }

    renderPlayers() {
        const tournament = this.getCurrentTournament();
        const container = document.getElementById('players-list');
        const actionsBar = document.getElementById('players-actions');
        const isAdmin = this.isAdmin();

        if (!tournament || tournament.players.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><svg width="32" height="32"><use href="#ic-target"/></svg></div>
                    <h3>Sin jugadores</h3>
                    <p>${isAdmin ? 'Agrega al menos 2 jugadores para generar un bracket' : 'No hay jugadores inscritos aún.'}</p>
                </div>
            `;
            if (actionsBar) actionsBar.style.display = 'none';
            return;
        }

        if (actionsBar) actionsBar.style.display = isAdmin ? 'flex' : 'none';

        const prizesAwarded = tournament.prizesAwarded;

        // If prizes awarded, sort by ranking (already updated). Otherwise by original ranking.
        const displayPlayers = [...tournament.players].sort((a, b) => a.ranking - b.ranking);

        container.innerHTML = displayPlayers.map((player, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'top-4';
            else if (index < 4) rankClass = 'top-4';
            else if (index < 8) rankClass = 'top-8';

            const displayPts = player.accumulatedPoints || player.points;
            const originalPts = player.points;
            const bonusEntry = prizesAwarded && tournament.prizeAwardedPositions &&
                tournament.prizeAwardedPositions.find(ap => ap.playerId === player.id);
            const bonusPts = bonusEntry ? bonusEntry.bonus : 0;

            const ptsDetail = prizesAwarded
                ? (bonusPts > 0
                    ? '<span class="pts-base">' + originalPts + '</span><span class="pts-bonus">+' + bonusPts + ' </span><span class="pts-total">' + displayPts + ' pts</span>'
                    : '<span class="pts-total">' + displayPts + ' pts</span>')
                : '<span class="pts-total">' + originalPts + ' pts</span>';

            const prizeLabel = bonusEntry
                ? (() => {
                    const pos = tournament.prizeAwardedPositions.find(ap => ap.playerId === player.id);
                    const posLabels = { 1: 'Campeón', 2: 'Subcampeón', 3: 'Semifinal', 5: 'Cuartos' };
                    return pos ? (posLabels[pos.position] || '') : '';
                })()
                : '';

            return '<div class="player-item' + (bonusPts > 0 ? ' player-item-winner' : '') + '" data-id="' + player.id + '">' +
                '<div class="player-rank ' + rankClass + '">' + player.ranking + '</div>' +
                '<div class="player-info">' +
                    '<div class="player-name-text">' + this.escapeHtml(player.name) +
                        (prizeLabel ? ' <span class="player-prize-badge">' + prizeLabel + '</span>' : '') +
                    '</div>' +
                    '<div class="player-meta">' + ptsDetail + '</div>' +
                '</div>' +
                (isAdmin ? '<div class="player-actions">' +
                    '<button class="btn-icon" onclick="app.startEditPlayer(' + player.id + ')" title="Editar"><svg width="14" height="14"><use href="#ic-pencil"/></svg></button>' +
                    '<button class="btn-icon delete" onclick="app.removePlayer(' + player.id + ')" title="Eliminar"><svg width="14" height="14"><use href="#ic-trash"/></svg></button>' +
                    '</div>' : '') +
                '</div>';
        }).join('');
    }

    updatePlayerStats() {
        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const count = tournament.players.length;
        const countEl = document.getElementById('player-count');
        if (countEl) countEl.textContent = `${count} jugador${count !== 1 ? 'es' : ''}`;

        const bracketSizeEl = document.getElementById('bracket-size');
        if (bracketSizeEl) {
            if (count >= 2) {
                const size = Math.pow(2, Math.ceil(Math.log2(count)));
                bracketSizeEl.textContent = `Bracket: ${size}`;
            } else {
                bracketSizeEl.textContent = 'Bracket: -';
            }
        }

        const expectedEl = document.getElementById('expected-count');
        if (expectedEl) {
            if (tournament.expectedPlayers) {
                expectedEl.textContent = `Esperados: ${tournament.expectedPlayers}`;
                expectedEl.style.display = 'inline-flex';
            } else {
                expectedEl.style.display = 'none';
            }
        }
    }

    // ============================================================
    // BRACKET GENERATION (ADMIN ONLY)
    // ============================================================
    generateBracket() {
        if (!this.checkAdmin('generar brackets')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        if (tournament.players.length < 2) {
            this.showToast('Necesitas al menos 2 jugadores', 'error');
            return;
        }

        const sorted = [...tournament.players].sort((a, b) => a.ranking - b.ranking);

        sorted.forEach((player, index) => {
            player.seedNumber = index + 1;
        });

        const n = sorted.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
        const byes = bracketSize - n;

        const seeds = this.distributeSeeds(sorted, bracketSize);

        const round1Matches = [];
        for (let i = 0; i < bracketSize / 2; i++) {
            const p1 = seeds[i * 2];
            const p2 = seeds[i * 2 + 1];

            round1Matches.push({
                id: `r1-m${i + 1}`,
                round: 1,
                matchNumber: i + 1,
                player1: p1,
                player2: p2,
                score1: null,
                score2: null,
                winner: null,
                completed: false,
                isBye: !p2
            });
        }

        round1Matches.forEach(match => {
            if (match.isBye && match.player1) {
                match.winner = match.player1;
                match.completed = true;
            }
        });

        tournament.bracket = {
            type: 'single-elimination',
            totalPlayers: n,
            bracketSize: bracketSize,
            byes: byes,
            rounds: Math.log2(bracketSize),
            createdAt: new Date().toISOString()
        };

        tournament.matches = round1Matches;
        this.generateSubsequentRounds(tournament);

        this._saveTournament(tournament);
        this.updateBanners(tournament);
        this.switchTournamentView('bracket');
        this.showToast(`Bracket generado · ${n} jugadores, ${byes} byes`, 'success');
    }

    distributeSeeds(players, bracketSize) {
        const seeds = new Array(bracketSize).fill(null);
        const sortedPlayers = [...players].sort((a, b) => a.ranking - b.ranking);
        const positions = this.getSeedingPositions(bracketSize);

        for (let seedIndex = 0; seedIndex < sortedPlayers.length; seedIndex++) {
            const bracketSlot = positions[seedIndex];
            seeds[bracketSlot] = sortedPlayers[seedIndex];
            sortedPlayers[seedIndex].seedNumber = seedIndex + 1;
        }

        return seeds;
    }

    getSeedingPositions(size) {
        if (size === 2) return [0, 1];
        if (size === 4) return [0, 3, 1, 2];
        if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
        if (size === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
        if (size === 32) return [
            0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20,
            1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21
        ];
        if (size === 64) return [
            0, 63, 31, 32, 15, 48, 16, 47, 7, 56, 24, 39, 8, 55, 23, 40,
            3, 60, 28, 35, 12, 51, 19, 44, 4, 59, 27, 36, 11, 52, 20, 43,
            1, 62, 30, 33, 14, 49, 17, 46, 6, 57, 25, 38, 9, 54, 22, 41,
            2, 61, 29, 34, 13, 50, 18, 45, 5, 58, 26, 37, 10, 53, 21, 42
        ];

        const positions = [];
        for (let i = 0; i < size / 2; i++) {
            positions.push(i);
            positions.push(size - 1 - i);
        }
        return positions;
    }

    generateSubsequentRounds(tournament) {
        const totalRounds = tournament.bracket.rounds;
        let matchesInRound = tournament.bracket.bracketSize / 4;
        let matchCounter = tournament.matches.length + 1;

        for (let round = 2; round <= totalRounds; round++) {
            for (let i = 0; i < matchesInRound; i++) {
                tournament.matches.push({
                    id: `r${round}-m${i + 1}`,
                    round: round,
                    matchNumber: matchCounter++,
                    player1: null,
                    player2: null,
                    score1: null,
                    score2: null,
                    winner: null,
                    completed: false,
                    isBye: false,
                    prevMatch1: round === 2 ? `r1-m${i * 2 + 1}` : `r${round-1}-m${i * 2 + 1}`,
                    prevMatch2: round === 2 ? `r1-m${i * 2 + 2}` : `r${round-1}-m${i * 2 + 2}`
                });
            }
            matchesInRound /= 2;
        }
    }

    // ============================================================
    // BRACKET RENDERING
    // ============================================================
    renderBracket() {
        const tournament = this.getCurrentTournament();
        const container = document.getElementById('bracket-container');
        const isAdmin = this.isAdmin();

        if (!tournament || !tournament.bracket) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><svg width="32" height="32"><use href="#ic-layout"/></svg></div>
                    <h3>No hay bracket generado</h3>
                    <p>${isAdmin ? 'Ve a la pestaña "Jugadores" y genera el bracket' : 'El bracket aparecerá aquí cuando el administrador lo genere.'}</p>
                </div>
            `;
            return;
        }

        const completed = tournament.matches.filter(m => m.completed).length;
        const totalRounds = tournament.bracket.rounds;
        const roundNames = this.getRoundNames(totalRounds);

        // Group matches by round
        const rounds = {};
        tournament.matches.forEach(match => {
            if (!rounds[match.round]) rounds[match.round] = [];
            rounds[match.round].push(match);
        });

        // Layout constants
        const CARD_W = 280;
        const CARD_H = 88;   // header(26) + row(31) + row(31)
        const COL_GAP = 56;  // horizontal gap between columns
        const HEADER_H = 36; // round header height
        const PAD_TOP = 20;
        const PAD_LEFT = 20;
        const PAD_RIGHT = 40;

        // Compute total canvas size
        const totalCols = totalRounds;
        const maxMatchesInRound1 = rounds[1] ? rounds[1].length : 1;
        const SLOT_H = CARD_H + 24; // vertical slot per match in round 1

        // For each round, compute vertical positions of each match center
        // Round r has (maxMatchesInRound1 / 2^(r-1)) matches
        // Each match occupies 2^(r-1) slots

        const matchPositions = {}; // matchId -> { x, y, midY }

        for (let r = 1; r <= totalRounds; r++) {
            const matchesInRound = rounds[r] ? rounds[r].length : 0;
            const slotsPerMatch = Math.pow(2, r - 1);
            const slotHeight = SLOT_H * slotsPerMatch;

            const colX = PAD_LEFT + (r - 1) * (CARD_W + COL_GAP);

            if (rounds[r]) {
                rounds[r].forEach((match, idx) => {
                    const slotTop = PAD_TOP + HEADER_H + idx * slotHeight;
                    const cardY = slotTop + (slotHeight - CARD_H) / 2;
                    const midY = cardY + CARD_H / 2;
                    matchPositions[match.id] = { x: colX, y: cardY, midY };
                });
            }
        }

        // Canvas height = enough for all round-1 matches
        const canvasH = PAD_TOP + HEADER_H + maxMatchesInRound1 * SLOT_H + PAD_TOP;
        const canvasW = PAD_LEFT + totalCols * CARD_W + (totalCols - 1) * COL_GAP + PAD_RIGHT;

        // Build the outer container
        container.innerHTML = '';
        container.style.padding = '0';

        // Top bar
        const bar = document.createElement('div');
        bar.className = 'bracket-top-bar';
        bar.innerHTML = `
            <div class="bracket-meta">
                <span class="badge">Single Elimination</span>
                <span class="badge badge-info">${tournament.matches.length} partidos</span>
                <span class="badge badge-success">${completed} completados</span>
            </div>
            ${isAdmin ? `
            <div class="bracket-actions">
                <button id="reset-bracket" class="btn btn-sm btn-danger-outline admin-only" onclick="app.resetBracket()">
                    <svg width="13" height="13"><use href="#ic-reset"/></svg> Reiniciar
                </button>
                <button id="export-bracket" class="btn btn-sm btn-secondary" onclick="app.exportBracket()">
                    <svg width="13" height="13"><use href="#ic-download"/></svg> Exportar
                </button>
            </div>` : ''}
        `;
        container.appendChild(bar);

        // Scroll wrapper
        const scrollWrap = document.createElement('div');
        scrollWrap.style.cssText = 'overflow-x:auto; overflow-y:auto; padding: 0 0 16px;';

        // The bracket stage: position:relative, exact pixel size
        const stage = document.createElement('div');
        stage.style.cssText = `position:relative; width:${canvasW}px; height:${canvasH}px; flex-shrink:0;`;

        // ── Draw round headers ──
        for (let r = 1; r <= totalRounds; r++) {
            const colX = PAD_LEFT + (r - 1) * (CARD_W + COL_GAP);
            const header = document.createElement('div');
            header.className = 'bk-round-header';
            header.style.cssText = `left:${colX}px; top:${PAD_TOP}px; width:${CARD_W}px;`;
            header.textContent = roundNames[r - 1];
            stage.appendChild(header);
        }

        // ── SVG connector layer (sits below cards) ──
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', canvasW);
        svg.setAttribute('height', canvasH);
        svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';
        stage.appendChild(svg);

        // Draw connectors: for rounds 2..N, draw lines from two source matches → one target match
        for (let r = 2; r <= totalRounds; r++) {
            if (!rounds[r]) continue;
            rounds[r].forEach((match) => {
                if (!match.prevMatch1 || !match.prevMatch2) return;
                const src1 = matchPositions[match.prevMatch1];
                const src2 = matchPositions[match.prevMatch2];
                const tgt = matchPositions[match.id];
                if (!src1 || !src2 || !tgt) return;

                // Source exit points: right edge of source match cards
                const x1 = src1.x + CARD_W;
                const y1 = src1.midY;
                const x2 = src2.x + CARD_W;
                const y2 = src2.midY;

                // Target entry point: left edge of target match card, vertically centred
                const xT = tgt.x;
                const yT = tgt.midY;

                // Mid x for the bend
                const xMid = x1 + COL_GAP / 2;

                // Check if both sources won (for accent colour)
                const src1Match = tournament.matches.find(m => m.id === match.prevMatch1);
                const src2Match = tournament.matches.find(m => m.id === match.prevMatch2);
                const bothDone = src1Match && src2Match && src1Match.completed && src2Match.completed;

                const strokeColor = bothDone ? 'var(--success)' : 'var(--gray-300)';
                const strokeW = bothDone ? 2 : 1.5;

                // Path: from src1 → horizontal → vertical bracket → horizontal → target
                // Line from src1: go right to xMid, vertical to yT level, right to xT
                // We draw a combined "bracket" shape:
                //   src1 right → xMid  (horizontal)
                //   src2 right → xMid  (horizontal)
                //   vertical line at xMid from y1 to y2
                //   xMid → xT at yT (horizontal, middle of y1..y2)

                const drawLine = (x1, y1, x2, y2, extra = '') => {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
                    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                    line.setAttribute('stroke', strokeColor);
                    line.setAttribute('stroke-width', strokeW);
                    line.setAttribute('stroke-linecap', 'round');
                    if (extra) line.setAttribute('style', extra);
                    svg.appendChild(line);
                };

                // Horizontal from src1 exit → xMid
                drawLine(x1, y1, xMid, y1);
                // Horizontal from src2 exit → xMid
                drawLine(x2, y2, xMid, y2);
                // Vertical bracket at xMid connecting y1 and y2
                drawLine(xMid, y1, xMid, y2);
                // Horizontal from xMid → target entry
                drawLine(xMid, yT, xT, yT);
            });
        }

        // ── Draw match cards ──
        for (let r = 1; r <= totalRounds; r++) {
            if (!rounds[r]) continue;
            const isLastRound = r === totalRounds;

            rounds[r].forEach((match) => {
                const pos = matchPositions[match.id];
                if (!pos) return;

                const cardEl = document.createElement('div');
                cardEl.className = 'bk-match-card';
                cardEl.id = `bk-${match.id}`;
                cardEl.style.cssText = `left:${pos.x}px; top:${pos.y}px; width:${CARD_W}px;`;

                const p1 = match.player1;
                const p2 = match.player2;
                const isBye = match.isBye;
                const isClickable = isAdmin && p1 && p2;

                if (match.completed) cardEl.classList.add('completed');
                if (isBye) cardEl.classList.add('bye');
                if (isClickable) {
                    cardEl.classList.add('clickable');
                    cardEl.onclick = () => this.openMatchModal(match.id);
                }

                const p1Win = match.winner && p1 && match.winner.id === p1.id;
                const p2Win = match.winner && p2 && match.winner.id === p2.id;

                const seed1 = p1 ? this.getSeedNumber(p1) : '–';
                const seed2 = p2 ? this.getSeedNumber(p2) : '–';
                const name1 = p1 ? this.escapeHtml(p1.name) : (isBye ? 'BYE' : '<span class="bk-tbd">Por definir</span>');
                const name2 = p2 ? this.escapeHtml(p2.name) : (isBye ? '&nbsp;' : '<span class="bk-tbd">Por definir</span>');

                // Build sets display
                const sets = match.sets || [];
                const numSets = match.setsFormat || 3;
                let setsHtml1 = '', setsHtml2 = '';

                if (match.completed && sets.length > 0) {
                    sets.forEach((set, si) => {
                        if (set.p1 === '' && set.p2 === '') return;
                        const p1WonSet = set.p1 > set.p2;
                        setsHtml1 += '<span class="bk-set ' + (p1WonSet ? 'bk-set-win' : 'bk-set-loss') + '">' + set.p1 + '</span>';
                        setsHtml2 += '<span class="bk-set ' + (!p1WonSet ? 'bk-set-win' : 'bk-set-loss') + '">' + set.p2 + '</span>';
                    });
                } else if (!match.completed) {
                    // Show empty set slots
                    for (let si = 0; si < numSets; si++) {
                        setsHtml1 += '<span class="bk-set bk-set-empty">–</span>';
                        setsHtml2 += '<span class="bk-set bk-set-empty">–</span>';
                    }
                }

                // Sets won summary (e.g. "2" in bold)
                const setsWon1 = match.score1 !== null ? match.score1 : '';
                const setsWon2 = match.score2 !== null ? match.score2 : '';

                const hintText = match.completed ? 'Clic para editar' : 'Clic para resultado';

                cardEl.innerHTML =
                    '<div class="bk-card-header">' +
                        '<span class="bk-round-label">' + roundNames[r - 1] + '</span>' +
                        (isClickable ? '<span class="bk-edit-hint">' + hintText + '</span>' : '') +
                        (match.completed ? '<span class="bk-done-dot"></span>' : '') +
                    '</div>' +
                    '<div class="bk-row ' + (p1Win ? 'win' : match.completed ? 'loss' : '') + '">' +
                        '<span class="bk-seed">' + seed1 + '</span>' +
                        '<span class="bk-name">' + name1 + '</span>' +
                        '<span class="bk-sets-wrap">' + setsHtml1 + '</span>' +
                        (match.completed ? '<span class="bk-sets-total ' + (p1Win ? 'bk-sets-total-win' : '') + '">' + setsWon1 + '</span>' : '') +
                    '</div>' +
                    '<div class="bk-divider"></div>' +
                    '<div class="bk-row ' + (p2Win ? 'win' : match.completed && p2 ? 'loss' : '') + '">' +
                        '<span class="bk-seed">' + seed2 + '</span>' +
                        '<span class="bk-name">' + name2 + '</span>' +
                        '<span class="bk-sets-wrap">' + setsHtml2 + '</span>' +
                        (match.completed ? '<span class="bk-sets-total ' + (p2Win ? 'bk-sets-total-win' : '') + '">' + setsWon2 + '</span>' : '') +
                    '</div>';

                stage.appendChild(cardEl);

                // Champion badge for last round
                if (isLastRound && match.completed && match.winner) {
                    const champ = document.createElement('div');
                    champ.className = 'bk-champion';
                    champ.style.cssText = `left:${pos.x}px; top:${pos.y + CARD_H + 10}px; width:${CARD_W}px;`;
                    champ.innerHTML = ` Campeón: <strong>${this.escapeHtml(match.winner.name)}</strong>`;
                    stage.appendChild(champ);
                }
            });
        }

        scrollWrap.appendChild(stage);
        container.appendChild(scrollWrap);
    }

    getRoundNames(totalRounds) {
        const names = [];
        for (let i = totalRounds; i >= 1; i--) {
            if (i === totalRounds) names.push('Final');
            else if (i === totalRounds - 1) names.push('Semifinal');
            else if (i === totalRounds - 2) names.push('Cuartos');
            else if (i === totalRounds - 3) names.push('Octavos');
            else if (i === totalRounds - 4) names.push('16avos');
            else names.push(`Ronda ${totalRounds - i + 1}`);
        }
        return names.reverse();
    }

    // Legacy shims (kept for compatibility — not used by new renderBracket)
    renderMatchContainer(match, isAdmin, isLastRound) { return ''; }
    renderMatchItem(match, isAdmin, isLastRound) { return ''; }
    renderMatchCard(match, isAdmin) { return ''; }
    renderMatchCardV2(match, isAdmin, hasChildren, isLastRound, matchIndex, matchesInRound) { return ''; }

    getSeedNumber(player) {
        if (player.seedNumber) {
            return player.seedNumber;
        }
        const tournament = this.getCurrentTournament();
        if (!tournament) return '-';
        const sorted = [...tournament.players].sort((a, b) => a.ranking - b.ranking);
        const index = sorted.findIndex(p => p.id === player.id);
        return index >= 0 ? index + 1 : '-';
    }

    
    // ============================================================
    // EDIT TOURNAMENT (ADMIN ONLY)
    // ============================================================
    openEditTournamentModal(tournamentId) {
        if (!this.checkAdmin('editar torneos')) return;
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        document.getElementById('edit-tournament-id').value = tournament.id;
        document.getElementById('edit-tournament-name').value = tournament.name;
        document.getElementById('edit-tournament-club').value = tournament.club;
        document.getElementById('edit-tournament-sport').value = tournament.sport || '';
        document.getElementById('edit-tournament-players-count').value = tournament.expectedPlayers || '';
        document.getElementById('edit-tournament-date').value = tournament.date || '';
        document.getElementById('edit-tournament-sets-format').value = tournament.setsFormat || 3;

        document.getElementById('edit-tournament-modal').classList.add('active');
    }

    closeEditTournamentModal() {
        document.getElementById('edit-tournament-modal').classList.remove('active');
    }

    saveEditTournament() {
        if (!this.checkAdmin('editar torneos')) return;

        const id = document.getElementById('edit-tournament-id').value;
        const tournament = this.tournaments.find(t => t.id === id);
        if (!tournament) return;

        const name = document.getElementById('edit-tournament-name').value.trim();
        const club = document.getElementById('edit-tournament-club').value.trim();
        const sport = document.getElementById('edit-tournament-sport').value;
        const expectedPlayers = parseInt(document.getElementById('edit-tournament-players-count').value) || null;
        const date = document.getElementById('edit-tournament-date').value;
        const setsFormat = parseInt(document.getElementById('edit-tournament-sets-format').value) || 3;

        if (!name) { this.showToast('El nombre es obligatorio', 'error'); return; }
        if (!club)  { this.showToast('El club es obligatorio', 'error'); return; }

        tournament.name = name;
        tournament.club = club;
        tournament.sport = sport || 'General';
        tournament.expectedPlayers = expectedPlayers;
        tournament.date = date;
        tournament.setsFormat = setsFormat;

        this._saveTournament(tournament);
        this.closeEditTournamentModal();
        this.renderTournaments();

        if (this.currentTournamentId === id) {
            this.updateBanners(tournament);
            this.updatePlayerStats();
        }

        this.showToast(`Torneo "${name}" actualizado`, 'success');
    }

    // ============================================================
    // EDIT PLAYER (ADMIN ONLY) — inline editing
    // ============================================================
    startEditPlayer(playerId) {
        if (!this.checkAdmin('editar jugadores')) return;
        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const player = tournament.players.find(p => p.id === playerId);
        if (!player) return;

        const item = document.querySelector(`.player-item[data-id="${playerId}"]`);
        if (!item) return;

        // Replace display with inline edit inputs
        item.classList.add('editing');
        item.innerHTML = `
            <div class="player-edit-form">
                <div class="form-group" style="flex:2">
                    <input type="text" class="player-edit-name" value="${this.escapeHtml(player.name)}" placeholder="Nombre" maxlength="30" />
                </div>
                <div class="form-group" style="flex:0 0 70px">
                    <input type="number" class="player-edit-ranking" value="${player.ranking}" placeholder="Rank" min="1" style="text-align:center" />
                </div>
                <div class="form-group" style="flex:0 0 110px">
                    <input type="number" class="player-edit-points" value="${player.points}" placeholder="Puntos Oficiales" min="1" style="text-align:center" />
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                    <button class="btn btn-sm btn-success" onclick="app.saveEditPlayer(${playerId})"><svg width="13" height="13"><use href="#ic-check"/></svg> Guardar</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.cancelEditPlayer()"><svg width="13" height="13"><use href="#ic-x"/></svg></button>
                </div>
            </div>
        `;

        item.querySelector('.player-edit-name').focus();
        item.querySelector('.player-edit-name').select();

        // Enter key support
        item.querySelector('.player-edit-name').addEventListener('keydown', e => {
            if (e.key === 'Enter') item.querySelector('.player-edit-ranking').focus();
            if (e.key === 'Escape') this.cancelEditPlayer();
        });
        item.querySelector('.player-edit-ranking').addEventListener('keydown', e => {
            if (e.key === 'Enter') this.saveEditPlayer(playerId);
            if (e.key === 'Escape') this.cancelEditPlayer();
        });
    }

    saveEditPlayer(playerId) {
        if (!this.checkAdmin('editar jugadores')) return;
        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const player = tournament.players.find(p => p.id === playerId);
        if (!player) return;

        const item = document.querySelector(`.player-item[data-id="${playerId}"]`);
        if (!item) return;

        const newName = item.querySelector('.player-edit-name').value.trim();
        const newRanking = parseInt(item.querySelector('.player-edit-ranking').value);
        const newPoints = parseInt(item.querySelector('.player-edit-points').value);

        if (!newName) { this.showToast('El nombre no puede estar vacío', 'error'); return; }
        if (!newRanking || newRanking < 1) { this.showToast('Ranking inválido', 'error'); return; }
        if (!newPoints || newPoints < 1) { this.showToast('Puntos inválidos', 'error'); return; }

        // Check duplicate name (excluding self)
        const duplicate = tournament.players.find(p => p.id !== playerId && p.name.toLowerCase() === newName.toLowerCase());
        if (duplicate) { this.showToast('Ya existe un jugador con ese nombre', 'error'); return; }

        const oldName = player.name;
        player.name = newName;
        player.ranking = newRanking;
        player.points = newPoints;

        // Update name references in matches (winner/player1/player2 are stored by reference copy)
        tournament.matches.forEach(m => {
            if (m.player1 && m.player1.id === playerId) { m.player1.name = newName; m.player1.ranking = newRanking; m.player1.points = newPoints; }
            if (m.player2 && m.player2.id === playerId) { m.player2.name = newName; m.player2.ranking = newRanking; m.player2.points = newPoints; }
            if (m.winner && m.winner.id === playerId)   { m.winner.name = newName; m.winner.ranking = newRanking; m.winner.points = newPoints; }
        });

        tournament.players.sort((a, b) => a.ranking - b.ranking);

        this._saveTournament(tournament);
        this.renderPlayers();
        this.updatePlayerStats();
        this.showToast(`Jugador actualizado: ${newName}`, 'success');
    }

    cancelEditPlayer() {
        this.renderPlayers();
    }

    // ============================================================
    // MATCH RESULTS (ADMIN ONLY)
    // ============================================================
    openMatchModal(matchId) {
        if (!this.isAdmin()) {
            this.showToast('Solo el administrador puede registrar resultados', 'error');
            return;
        }

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const match = tournament.matches.find(m => m.id === matchId);
        if (!match || !match.player1 || !match.player2) return;

        // If completed, ask before editing
        if (match.completed) {
            this._openMatchModalForEdit(match, tournament);
            return;
        }

        this._openMatchModalForEdit(match, tournament);
    }

    _openMatchModalForEdit(match, tournament) {
        this.currentMatch = match;

        const isEdit = match.completed;
        document.getElementById('match-modal-title').textContent = isEdit ? ' Editar Resultado' : ' Registrar Resultado';

        const warnEl = document.getElementById('match-edit-warning');
        if (warnEl) warnEl.style.display = isEdit ? 'flex' : 'none';

        // Store player info for grid render
        this._modalP1 = { seed: '#' + this.getSeedNumber(match.player1), name: match.player1.name };
        this._modalP2 = { seed: '#' + this.getSeedNumber(match.player2), name: match.player2.name };

        const roundNames = this.getRoundNames(tournament.bracket.rounds);
        document.getElementById('modal-match-info').textContent =
            roundNames[match.round - 1] + ' • ' + match.id;

        // Format comes from tournament — fixed, not user-selectable per match
        const fmt = tournament.setsFormat || 3;
        this._currentSetsFormat = fmt;
        const fmtLabels = { 1: '1 set', 3: 'Al mejor de 3', 5: 'Al mejor de 5' };
        const badge = document.getElementById('modal-format-badge');
        if (badge) badge.textContent = (fmtLabels[fmt] || fmt + ' sets');

        this._renderSetsInputs(fmt, match);

        document.getElementById('match-modal').classList.add('active');
    }

    _setSetsFormat(numSets, match) {
        // Update button states
        document.querySelectorAll('.sets-fmt-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.sets) === numSets);
        });

        this._currentSetsFormat = numSets;
        this._renderSetsInputs(numSets, match);
    }

    _renderSetsInputs(numSets, match) {
        const savedSets = match.sets || [];
        const scoreboard = document.getElementById('sets-scoreboard');

        // Grid: [player-name] [set1] [set2] ... [setN] [total]
        // player col = 1fr, each set col = 56px, total col = 52px
        const setCols = Array(numSets).fill('56px').join(' ');
        const gridTemplate = '1fr ' + setCols + ' 52px';

        // Build set header cells
        let setHeaderCells = '';
        for (let s = 0; s < numSets; s++) {
            setHeaderCells += '<div class="sg-header-cell">S' + (s + 1) + '</div>';
        }

        // Build set input cells for each player
        const buildSetCells = (playerNum) => {
            let cells = '';
            for (let s = 0; s < numSets; s++) {
                const saved = savedSets[s] ? (playerNum === 1 ? savedSets[s].p1 : savedSets[s].p2) : '';
                cells += '<div class="sg-set-cell" data-set="' + s + '" data-player="' + playerNum + '">' +
                    '<input type="number" class="set-input" data-set="' + s + '" data-player="' + playerNum +
                    '" min="0" max="99" placeholder="–" value="' + (saved !== '' ? saved : '') + '">' +
                    '</div>';
            }
            return cells;
        };

        scoreboard.innerHTML =
            // Header row
            '<div class="sg-row sg-header" style="grid-template-columns:' + gridTemplate + '">' +
                '<div class="sg-header-cell sg-name-header">Jugador</div>' +
                setHeaderCells +
                '<div class="sg-header-cell sg-total-header">Sets</div>' +
            '</div>' +
            // Player 1 row
            '<div class="sg-row sg-player-row" id="sg-row-p1" style="grid-template-columns:' + gridTemplate + '">' +
                '<div class="sg-name-cell" id="modal-player1">' +
                    '<span class="player-seed" id="p1-seed">' + this.escapeHtml(this._modalP1.seed) + '</span>' +
                    '<span class="player-name" id="p1-name">' + this.escapeHtml(this._modalP1.name) + '</span>' +
                '</div>' +
                buildSetCells(1) +
                '<div class="sg-total-cell" id="sets-total-p1">–</div>' +
            '</div>' +
            // Player 2 row
            '<div class="sg-row sg-player-row" id="sg-row-p2" style="grid-template-columns:' + gridTemplate + '">' +
                '<div class="sg-name-cell" id="modal-player2">' +
                    '<span class="player-seed" id="p2-seed">' + this.escapeHtml(this._modalP2.seed) + '</span>' +
                    '<span class="player-name" id="p2-name">' + this.escapeHtml(this._modalP2.name) + '</span>' +
                '</div>' +
                buildSetCells(2) +
                '<div class="sg-total-cell" id="sets-total-p2">–</div>' +
            '</div>';

        // Bind live update
        document.querySelectorAll('.set-input').forEach(inp => {
            inp.addEventListener('input', () => this._updateSetsLive());
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    // Navigate: p1-set1, p1-set2, ..., p2-set1, p2-set2, ..., save
                    const allInputs = [...document.querySelectorAll('.set-input')];
                    const idx = allInputs.indexOf(e.target);
                    if (idx >= 0 && idx < allInputs.length - 1) allInputs[idx + 1].focus();
                    else document.getElementById('modal-save').focus();
                }
            });
        });

        this._updateSetsLive();

        const first = document.querySelector('.set-input');
        if (first) setTimeout(() => first.focus(), 80);
    }

    _updateSetsLive() {
        const numSets = this._currentSetsFormat || 3;
        const toWin = Math.ceil(numSets / 2);
        let p1Sets = 0, p2Sets = 0;

        for (let s = 0; s < numSets; s++) {
            const inp1 = document.querySelector('.set-input[data-set="' + s + '"][data-player="1"]');
            const inp2 = document.querySelector('.set-input[data-set="' + s + '"][data-player="2"]');
            if (!inp1 || !inp2) continue;

            const v1 = inp1.value.trim();
            const v2 = inp2.value.trim();

            const cell1 = inp1.closest('.sg-set-cell');
            const cell2 = inp2.closest('.sg-set-cell');
            if (cell1) cell1.classList.remove('set-win', 'set-loss');
            if (cell2) cell2.classList.remove('set-win', 'set-loss');

            if (v1 !== '' && v2 !== '') {
                const n1 = parseInt(v1), n2 = parseInt(v2);
                if (!isNaN(n1) && !isNaN(n2) && n1 !== n2) {
                    if (n1 > n2) {
                        if (cell1) cell1.classList.add('set-win');
                        if (cell2) cell2.classList.add('set-loss');
                        p1Sets++;
                    } else {
                        if (cell2) cell2.classList.add('set-win');
                        if (cell1) cell1.classList.add('set-loss');
                        p2Sets++;
                    }
                }
            }
        }

        // Update totals
        const t1 = document.getElementById('sets-total-p1');
        const t2 = document.getElementById('sets-total-p2');
        if (t1) {
            t1.textContent = p1Sets > 0 || p2Sets > 0 ? p1Sets : '–';
            t1.className = 'sg-total-cell' + (p1Sets > p2Sets ? ' sets-total-win' : '');
        }
        if (t2) {
            t2.textContent = p1Sets > 0 || p2Sets > 0 ? p2Sets : '–';
            t2.className = 'sg-total-cell' + (p2Sets > p1Sets ? ' sets-total-win' : '');
        }

        // Highlight winning row
        const row1 = document.getElementById('sg-row-p1');
        const row2 = document.getElementById('sg-row-p2');
        if (row1) row1.classList.toggle('sg-row-winning', p1Sets >= toWin);
        if (row2) row2.classList.toggle('sg-row-winning', p2Sets >= toWin);

        // Live summary
        const summary = document.getElementById('sets-live-summary');
        if (!summary) return;
        if (p1Sets >= toWin || p2Sets >= toWin) {
            const winnerName = p1Sets >= toWin
                ? (document.getElementById('p1-name') || {}).textContent || ''
                : (document.getElementById('p2-name') || {}).textContent || '';
            summary.innerHTML = '<span class="sets-winner-preview"> Ganador: <strong>' + this.escapeHtml(winnerName) + '</strong> (' + Math.max(p1Sets,p2Sets) + '–' + Math.min(p1Sets,p2Sets) + ' sets)</span>';
            summary.style.display = 'flex';
        } else if (p1Sets > 0 || p2Sets > 0) {
            summary.innerHTML = '<span class="sets-partial">Parcial: ' + p1Sets + ' – ' + p2Sets + ' sets</span>';
            summary.style.display = 'flex';
        } else {
            summary.style.display = 'none';
        }
    }

    closeModal() {
        const modal = document.getElementById('match-modal');
        if (modal) modal.classList.remove('active');
        this.currentMatch = null;
    }

    saveMatchResult() {
        if (!this.isAdmin()) {
            this.showToast('Solo el administrador puede guardar resultados', 'error');
            return;
        }
        if (!this.currentMatch) return;

        const numSets = this._currentSetsFormat || 3;
        const toWin = Math.ceil(numSets / 2);
        const sets = [];
        let p1Sets = 0, p2Sets = 0;

        for (let s = 0; s < numSets; s++) {
            const inp1 = document.querySelector('.set-input[data-set="' + s + '"][data-player="1"]');
            const inp2 = document.querySelector('.set-input[data-set="' + s + '"][data-player="2"]');
            const v1 = inp1 && inp1.value.trim() !== '' ? parseInt(inp1.value) : null;
            const v2 = inp2 && inp2.value.trim() !== '' ? parseInt(inp2.value) : null;

            if (v1 !== null && v2 !== null) {
                if (v1 === v2) {
                    this.showToast('Set ' + (s + 1) + ': no puede haber empate', 'error');
                    return;
                }
                sets.push({ p1: v1, p2: v2 });
                if (v1 > v2) p1Sets++; else p2Sets++;
            } else {
                sets.push({ p1: v1 !== null ? v1 : '', p2: v2 !== null ? v2 : '' });
            }
        }

        if (p1Sets < toWin && p2Sets < toWin) {
            this.showToast('Ingresa suficientes sets para determinar un ganador', 'error');
            return;
        }

        const tournament = this.getCurrentTournament();
        const match = this.currentMatch;
        const wasCompleted = match.completed;
        const oldWinner = match.winner;

        // Store sets data and derived scores (sets won)
        match.sets = sets;
        match.setsFormat = numSets;
        match.score1 = p1Sets;
        match.score2 = p2Sets;

        const newWinner = p1Sets >= toWin ? match.player1 : match.player2;
        match.winner = newWinner;
        match.completed = true;

        if (wasCompleted && oldWinner && newWinner.id !== oldWinner.id) {
            this._cascadeWinnerChange(match, oldWinner, newWinner, tournament);
        } else if (!wasCompleted) {
            this.advanceWinner(match, tournament);
        }

        this._saveTournament(tournament);
        this.updateBanners(tournament);
        this.renderBracket();
        this.closeModal();

        const setStr = p1Sets + '–' + p2Sets;
        if (wasCompleted) {
            this.showToast('Resultado actualizado: ' + newWinner.name + ' (' + setStr + ')', 'success');
        } else {
            this.showToast(newWinner.name + ' avanza · ' + setStr + ' sets', 'success');
        }

        const finalMatch = tournament.matches.find(m => m.round === tournament.bracket.rounds);
        if (finalMatch && finalMatch.completed) {
            setTimeout(() => {
                this.showToast('¡Campeón: ' + finalMatch.winner.name + '!', 'success');
                this.switchTournamentView('results');
            }, 500);
        }
    }

    advanceWinner(match, tournament) {
        const nextMatch = tournament.matches.find(m => 
            (m.prevMatch1 === match.id || m.prevMatch2 === match.id) && !m.completed
        );
        if (nextMatch) {
            if (!nextMatch.player1) {
                nextMatch.player1 = match.winner;
            } else if (!nextMatch.player2) {
                nextMatch.player2 = match.winner;
            }
        }
    }

    // Cascade a winner change: clear old winner from all subsequent matches
    _cascadeWinnerChange(match, oldWinner, newWinner, tournament) {
        // Find the next match that has oldWinner
        const nextMatch = tournament.matches.find(m =>
            m.prevMatch1 === match.id || m.prevMatch2 === match.id
        );
        if (!nextMatch) {
            // No next match — just update this match's winner, already done
            return;
        }

        // Replace oldWinner with newWinner in nextMatch slots
        if (nextMatch.player1 && nextMatch.player1.id === oldWinner.id) {
            nextMatch.player1 = newWinner;
        } else if (nextMatch.player2 && nextMatch.player2.id === oldWinner.id) {
            nextMatch.player2 = newWinner;
        }

        // If nextMatch was completed and its winner was oldWinner, cascade further
        if (nextMatch.completed && nextMatch.winner && nextMatch.winner.id === oldWinner.id) {
            nextMatch.winner = null;
            nextMatch.score1 = null;
            nextMatch.score2 = null;
            nextMatch.completed = false;
            this._cascadeWinnerChange(nextMatch, oldWinner, newWinner, tournament);
        } else if (nextMatch.completed) {
            // nextMatch was completed but with a different winner — don't overwrite, just update the slot
        } else {
            // nextMatch not completed — slot already updated above, nothing more to do
        }
    }

    // ============================================================
    // RESULTS & STATS (BOTH ROLES)
    // ============================================================
    renderResults() {
        const tournament = this.getCurrentTournament();
        const container = document.getElementById('results-container');
        const isAdmin = this.isAdmin();

        if (!tournament || !tournament.bracket || tournament.matches.filter(m => m.completed).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><svg width="32" height="32"><use href="#ic-trending"/></svg></div>
                    <h3>Sin resultados</h3>
                    <p>Los resultados aparecerán aquí cuando se completen partidos.</p>
                </div>
            `;
            return;
        }

        const standings = this.calculateStandings(tournament);
        const stats = this.calculateStats(tournament);
        const totalRounds = tournament.bracket.rounds;
        const finalMatch = tournament.matches.find(m => m.round === totalRounds);
        const isTournamentComplete = finalMatch && finalMatch.completed;
        const prizesAwarded = tournament.prizesAwarded;

        let html = '';

        // Prize action banner
        if (isAdmin && isTournamentComplete) {
            const bannerIcon = prizesAwarded
                ? '<svg width="20" height="20"><use href="#ic-check"/></svg>'
                : '<svg width="20" height="20"><use href="#ic-gift"/></svg>';
            const btnIcon = prizesAwarded
                ? '<svg width="14" height="14"><use href="#ic-refresh"/></svg>'
                : '<svg width="14" height="14"><use href="#ic-gift"/></svg>';
            const dateStr = prizesAwarded
                ? new Date(tournament.prizesAwardedAt).toLocaleDateString('es-ES', {day:'numeric',month:'short',year:'numeric'})
                : '';
            html += `
                <div class="prize-action-banner ${prizesAwarded ? 'prize-awarded' : ''}">
                    <div class="prize-banner-left">
                        <div class="prize-banner-icon-wrap ${prizesAwarded ? 'icon-awarded' : 'icon-pending'}">${bannerIcon}</div>
                        <div>
                            <div class="prize-banner-title">${prizesAwarded ? 'Puntos de premio otorgados' : 'Torneo completado — Otorgar premios'}</div>
                            <div class="prize-banner-desc">${prizesAwarded
                                ? 'Otorgados el ' + dateStr + ' · Ranking actualizado'
                                : 'Suma puntos bonus a los ganadores y actualiza el ranking automáticamente'
                            }</div>
                        </div>
                    </div>
                    <button class="btn ${prizesAwarded ? 'btn-secondary' : 'btn-primary'}" onclick="app.openPrizeModal()">
                        ${btnIcon}
                        ${prizesAwarded ? 'Recalcular premios' : 'Otorgar puntos de premio'}
                    </button>
                </div>
            `;
        }

        html += '<div class="results-grid">';

        // Standings with updated points
        const standingsHtml = standings.map((s, i) => {
            const player = tournament.players.find(p => p.name === s.name);
            const hasBonus = player && tournament.prizeAwardedPositions && tournament.prizeAwardedPositions.find(ap => ap.playerId === player.id);
            const bonus = hasBonus ? (tournament.prizeConfig && tournament.prizeConfig[hasBonus.position]) || 0 : 0;
            const accPts = player ? (player.accumulatedPoints || player.points) : 0;
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
            const bonusBadge = bonus > 0 ? '<span class="standing-bonus">+' + bonus + ' pts \uD83C\uDFC5</span>' : '';
            const ptsBadge = prizesAwarded ? '<div class="standing-pts">' + accPts + '<span>pts</span></div>' : '';
            return '<div class="standing-item">' +
                '<div class="standing-rank ' + rankClass + '">' + (i + 1) + '</div>' +
                '<div class="standing-info">' +
                    '<div class="standing-name">' + this.escapeHtml(s.name) + '</div>' +
                    '<div class="standing-detail">Ranking #' + (player ? player.ranking : s.seed) + ' \u2022 ' + s.matchesWon + 'V / ' + s.matchesLost + 'D' + bonusBadge + '</div>' +
                '</div>' +
                ptsBadge +
                '</div>';
        }).join('');

        html += '<div class="result-card">' +
            '<h4>\uD83C\uDFC5 Clasificación Final</h4>' +
            '<div class="standings-list">' + standingsHtml + '</div>' +
            '</div>';

        // Stats
        html += `
            <div class="result-card">
                <h4>Estadísticas del Torneo</h4>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">${stats.totalPlayers}</div>
                        <div class="stat-label">Jugadores</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.totalMatches}</div>
                        <div class="stat-label">Partidos</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.completedMatches}</div>
                        <div class="stat-label">Completados</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.progress}%</div>
                        <div class="stat-label">Progreso</div>
                    </div>
                </div>

                ${prizesAwarded ? `
                <div class="ranking-updated-card">
                    <div class="ranking-updated-title">Ranking actualizado</div>
                    <div class="ranking-updated-list">
                        ${[...tournament.players].sort((a,b) => a.ranking - b.ranking).map(p => `
                            <div class="ranking-row">
                                <span class="ranking-pos">#${p.ranking}</span>
                                <span class="ranking-name">${this.escapeHtml(p.name)}</span>
                                <span class="ranking-pts">${p.accumulatedPoints || p.points} pts</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    calculateStandings(tournament) {
        const playerStats = {};

        tournament.players.forEach(p => {
            playerStats[p.id] = { 
                player: p, 
                matchesWon: 0, 
                matchesLost: 0,
                roundReached: 0 
            };
        });

        tournament.matches.forEach(match => {
            if (!match.completed) return;

            const roundWeight = match.round;

            if (match.player1) {
                const p1Stats = playerStats[match.player1.id];
                if (p1Stats) {
                    if (match.winner.id === match.player1.id) {
                        p1Stats.matchesWon++;
                        p1Stats.roundReached = Math.max(p1Stats.roundReached, roundWeight);
                    } else {
                        p1Stats.matchesLost++;
                    }
                }
            }

            if (match.player2) {
                const p2Stats = playerStats[match.player2.id];
                if (p2Stats) {
                    if (match.winner.id === match.player2.id) {
                        p2Stats.matchesWon++;
                        p2Stats.roundReached = Math.max(p2Stats.roundReached, roundWeight);
                    } else {
                        p2Stats.matchesLost++;
                    }
                }
            }
        });

        const sorted = Object.values(playerStats).sort((a, b) => {
            if (b.roundReached !== a.roundReached) return b.roundReached - a.roundReached;
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            return a.player.ranking - b.player.ranking;
        });

        return sorted.map(s => ({
            name: s.player.name,
            seed: this.getSeedNumber(s.player),
            matchesWon: s.matchesWon,
            matchesLost: s.matchesLost,
            roundReached: s.roundReached
        }));
    }

    calculateStats(tournament) {
        const totalMatches = tournament.matches.length;
        const completedMatches = tournament.matches.filter(m => m.completed).length;
        const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

        return {
            totalPlayers: tournament.players.length,
            totalMatches: totalMatches,
            completedMatches: completedMatches,
            progress: progress
        };
    }

    // ============================================================
    // UTILITIES (ADMIN ONLY for destructive actions)
    // ============================================================
    resetBracket() {
        if (!this.checkAdmin('reiniciar brackets')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament || !tournament.bracket) return;
        if (!confirm('¿Reiniciar el bracket? Se perderán todos los resultados.')) return;

        tournament.bracket = null;
        tournament.matches = [];
        this._saveTournament(tournament);
        this.updateBanners(tournament);
        this.renderBracket();
        this.renderResults();
        this.showToast('Bracket reiniciado', 'warning');
    }

    exportBracket() {
        const tournament = this.getCurrentTournament();
        if (!tournament || !tournament.bracket) {
            this.showToast('No hay bracket para exportar', 'error');
            return;
        }

        const data = {
            tournament: {
                name: tournament.name,
                club: tournament.club,
                sport: tournament.sport,
                date: tournament.date,
                format: tournament.format
            },
            players: tournament.players,
            bracket: tournament.bracket,
            matches: tournament.matches,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tournament.name.replace(/\s+/g, '_')}_${tournament.date}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Bracket exportado', 'success');
    }

    // ============================================================
    // PRIZE AWARD & RANKING UPDATE SYSTEM (ADMIN ONLY)
    // ============================================================

    /**
     * Returns the finishing positions for the current tournament.
     * Returns: [{ position, label, player }]
     */
    getTournamentPositions(tournament) {
        if (!tournament || !tournament.bracket) return [];

        const totalRounds = tournament.bracket.rounds;
        const finalMatch = tournament.matches.find(m => m.round === totalRounds);
        if (!finalMatch || !finalMatch.completed) return [];

        const positions = [];

        // 1st place
        positions.push({ position: 1, label: '1er Lugar', player: finalMatch.winner });

        // 2nd place: the loser of the final
        const runnerUp = finalMatch.winner.id === finalMatch.player1?.id
            ? finalMatch.player2
            : finalMatch.player1;
        if (runnerUp) positions.push({ position: 2, label: '2do Lugar', player: runnerUp });

        // 3rd/4th: losers of semifinals (round before final)
        if (totalRounds >= 2) {
            const sfMatches = tournament.matches.filter(m => m.round === totalRounds - 1 && m.completed);
            sfMatches.forEach(sf => {
                const sfLoser = sf.winner.id === sf.player1?.id ? sf.player2 : sf.player1;
                if (sfLoser) positions.push({ position: 3, label: '3er/4to Lugar', player: sfLoser });
            });
        }

        // Quarter-final losers (5th-8th)
        if (totalRounds >= 3) {
            const qfMatches = tournament.matches.filter(m => m.round === totalRounds - 2 && m.completed);
            qfMatches.forEach(qf => {
                const qfLoser = qf.winner.id === qf.player1?.id ? qf.player2 : qf.player1;
                if (qfLoser) positions.push({ position: 5, label: '5°-8° Lugar', player: qfLoser });
            });
        }

        return positions;
    }

    openPrizeModal() {
        if (!this.checkAdmin('otorgar premios')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const positions = this.getTournamentPositions(tournament);
        if (positions.length === 0) {
            this.showToast('El torneo debe estar completo para otorgar premios', 'error');
            return;
        }

        // Check if prizes already awarded
        const alreadyAwarded = tournament.prizesAwarded;

        document.getElementById('prize-modal-title').textContent = alreadyAwarded
            ? 'Recalcular Premios'
            : 'Otorgar Puntos de Premio';
        document.getElementById('prize-modal-subtitle').textContent = alreadyAwarded
            ? 'Los premios ya fueron otorgados. Puedes modificarlos y recalcular.'
            : `Configura los puntos bonus por posición en "${tournament.name}"`;

        // Render podium
        this._renderPodiumPreview(positions, tournament);

        // Render prize inputs
        this._renderPrizeInputs(positions, tournament);

        // Hide ranking preview
        document.getElementById('ranking-update-preview').style.display = 'none';
        document.getElementById('ranking-preview-list').innerHTML = '';

        const btn = document.getElementById('award-prizes-btn');
        btn.textContent = alreadyAwarded ? 'Recalcular' : 'Otorgar Puntos';

        document.getElementById('prize-modal').classList.add('active');
    }

    closePrizeModal() {
        document.getElementById('prize-modal').classList.remove('active');
        document.getElementById('ranking-update-preview').style.display = 'none';
    }

    _renderPodiumPreview(positions, tournament) {
        const podium = document.getElementById('podium-preview');
        const top3 = positions.filter(p => p.position <= 2);

        podium.innerHTML = `
            <div class="podium-wrap">
                ${top3.map(p => `
                    <div class="podium-card podium-pos-${p.position}">
                        <div class="podium-pos-label">${p.label}</div>
                        <div class="podium-player-name">${this.escapeHtml(p.player?.name || 'TBD')}</div>
                        <div class="podium-current-pts">Pts actuales: <strong>${p.player ? (this._getPlayerCurrentPoints(p.player.id, tournament)) : '—'}</strong></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    _getPlayerCurrentPoints(playerId, tournament) {
        // Get the most up-to-date points from tournament players
        const p = tournament.players.find(pl => pl.id === playerId);
        return p ? (p.accumulatedPoints || p.points) : 0;
    }

    _renderPrizeInputs(positions, tournament) {
        const container = document.getElementById('prize-inputs');

        // Default prize values (configurable per position)
        const defaultPrizes = { 1: 500, 2: 300, 3: 150, 5: 50 };
        const savedPrizes = tournament.prizeConfig || {};

        // Group positions
        const grouped = {};
        positions.forEach(p => {
            if (!grouped[p.position]) grouped[p.position] = p;
        });

        container.innerHTML = `
            <div class="prize-inputs-title">Puntos bonus a sumar por posición:</div>
            <div class="prize-fields">
                ${Object.values(grouped).map(p => `
                    <div class="prize-field-row">
                        <div class="prize-field-label">${p.label}</div>
                        <div class="prize-field-player">${this.escapeHtml(p.player?.name || 'N/A')}</div>
                        <div class="prize-field-input-wrap">
                            <span class="prize-field-plus">+</span>
                            <input
                                type="number"
                                class="prize-point-input"
                                data-position="${p.position}"
                                value="${savedPrizes[p.position] !== undefined ? savedPrizes[p.position] : (defaultPrizes[p.position] || 50)}"
                                min="0"
                                step="10"
                                placeholder="0"
                            />
                            <span class="prize-field-unit">pts</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    _getPrizeInputValues() {
        const inputs = document.querySelectorAll('.prize-point-input');
        const prizes = {};
        inputs.forEach(input => {
            prizes[parseInt(input.dataset.position)] = parseInt(input.value) || 0;
        });
        return prizes;
    }

    previewRankingUpdate() {
        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const prizes = this._getPrizeInputValues();
        const positions = this.getTournamentPositions(tournament);

        // Build preview: compute new points for each player in the tournament
        const playerPreviews = tournament.players.map(player => {
            const currentPts = player.accumulatedPoints || player.points;

            // Find if this player has a prize
            const pos = positions.find(p => p.player?.id === player.id);
            let bonusPts = 0;

            if (pos) {
                // For positions like 3rd/4th or 5th-8th, use the same prize pool entry
                bonusPts = prizes[pos.position] || 0;
            }

            return {
                id: player.id,
                name: player.name,
                currentPts,
                bonusPts,
                newPts: currentPts + bonusPts,
                currentRanking: player.ranking,
                posLabel: pos ? pos.label : null
            };
        });

        // Sort by newPts descending to compute new ranking
        const sorted = [...playerPreviews].sort((a, b) => b.newPts - a.newPts);
        sorted.forEach((p, i) => { p.newRanking = i + 1; });

        // Render preview
        const previewList = document.getElementById('ranking-preview-list');
        previewList.innerHTML = `
            <div class="ranking-preview-table">
                <div class="rp-header">
                    <span>Jugador</span>
                    <span>Pts actuales</span>
                    <span>Bonus</span>
                    <span>Pts nuevos</span>
                    <span>Ranking</span>
                </div>
                ${sorted.map(p => `
                    <div class="rp-row ${p.bonusPts > 0 ? 'rp-row-winner' : ''}">
                        <span class="rp-name">
                            ${this.escapeHtml(p.name)}
                            ${p.posLabel ? `<span class="rp-pos-badge">${p.posLabel}</span>` : ''}
                        </span>
                        <span class="rp-pts">${p.currentPts}</span>
                        <span class="rp-bonus ${p.bonusPts > 0 ? 'rp-bonus-positive' : ''}">
                            ${p.bonusPts > 0 ? `+${p.bonusPts}` : '—'}
                        </span>
                        <span class="rp-new-pts">${p.newPts}</span>
                        <span class="rp-rank">
                            #${p.newRanking}
                            ${p.currentRanking !== p.newRanking
                                ? `<span class="rp-rank-change ${p.newRanking < p.currentRanking ? 'up' : 'down'}">
                                    ${p.newRanking < p.currentRanking ? '▲' : '▼'}${Math.abs(p.currentRanking - p.newRanking)}
                                   </span>`
                                : '<span class="rp-rank-same">—</span>'
                            }
                        </span>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('ranking-update-preview').style.display = 'block';
        this.showToast('Vista previa generada', 'info');
    }

    awardPrizes() {
        if (!this.checkAdmin('otorgar premios')) return;

        const tournament = this.getCurrentTournament();
        if (!tournament) return;

        const prizes = this._getPrizeInputValues();
        const positions = this.getTournamentPositions(tournament);

        // Revert previous prizes if re-awarding
        if (tournament.prizesAwarded && tournament.prizeConfig) {
            tournament.players.forEach(player => {
                const oldPos = tournament.prizeAwardedPositions?.find(p => p.playerId === player.id);
                if (oldPos) {
                    const oldBonus = tournament.prizeConfig[oldPos.position] || 0;
                    player.accumulatedPoints = (player.accumulatedPoints || player.points) - oldBonus;
                }
            });
        }

        // Apply new prizes
        const awardedPositions = [];
        positions.forEach(pos => {
            if (!pos.player) return;
            const bonus = prizes[pos.position] || 0;
            const playerInTournament = tournament.players.find(p => p.id === pos.player.id);
            if (playerInTournament) {
                playerInTournament.accumulatedPoints = (playerInTournament.accumulatedPoints || playerInTournament.points) + bonus;
                awardedPositions.push({ playerId: pos.player.id, position: pos.position, bonus });
            }
        });

        // Update rankings based on accumulated points (within this tournament's players)
        const sorted = [...tournament.players].sort((a, b) => {
            const ptsA = a.accumulatedPoints || a.points;
            const ptsB = b.accumulatedPoints || b.points;
            return ptsB - ptsA;
        });
        sorted.forEach((player, idx) => {
            player.ranking = idx + 1;
        });
        tournament.players.sort((a, b) => a.ranking - b.ranking);

        // Save prize config
        tournament.prizeConfig = prizes;
        tournament.prizesAwarded = true;
        tournament.prizesAwardedAt = new Date().toISOString();
        tournament.prizeAwardedPositions = awardedPositions;

        this._saveTournament(tournament);
        this.closePrizeModal();
        this.renderResults();
        this.renderPlayers();
        this.updatePlayerStats();

        this.showToast('Puntos otorgados · ranking actualizado', 'success');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: '<svg width="16" height="16" style="color:var(--success);flex-shrink:0"><use href="#ic-check"/></svg>',
            error:   '<svg width="16" height="16" style="color:var(--danger);flex-shrink:0"><use href="#ic-alert"/></svg>',
            warning: '<svg width="16" height="16" style="color:var(--warning);flex-shrink:0"><use href="#ic-alert"/></svg>',
            info:    '<svg width="16" height="16" style="color:var(--primary);flex-shrink:0"><use href="#ic-zap"/></svg>',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = (icons[type] || '') + '<span>' + message + '</span>';
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

function generateBracket(players) {
  if (!players || players.length === 0) return [];

  let rounds = [];
  let currentRound = [...players];
  let roundNumber = 1;

  while (currentRound.length > 1) {
    let matches = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      matches.push({
        player1: currentRound[i] || "BYE",
        player2: currentRound[i + 1] || "BYE",
        winner: null
      });
    }

    rounds.push({
      round: roundNumber,
      matches: matches
    });

    // preparar siguiente ronda (vacío aún)
    currentRound = new Array(Math.ceil(matches.length / 2)).fill(null);
    roundNumber++;
  }

  return rounds;
}

function renderBracket(bracketData) {
  const container = document.getElementById("bracket-container");

  container.innerHTML = `
    <div class="bracket">
      ${bracketData.map(r => `
        <div class="round">
          <div class="round-title">Ronda ${r.round}</div>
          ${r.matches.map(m => `
            <div class="match">
              <div class="player">${m.player1 || "TBD"}</div>
              <div class="player">${m.player2 || "TBD"}</div>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function mapMatchesToBracket(matches) {
  const rounds = {};

  matches.forEach(m => {
    if (!rounds[m.round]) {
      rounds[m.round] = [];
    }

    rounds[m.round].push({
      player1: m.player1,
      player2: m.player2,
      winner: m.winner
    });
  });

  return Object.keys(rounds).map(r => ({
    round: r,
    matches: rounds[r]
  }));
}

// Initialize app and expose globally so onclick= handlers in HTML can reach it
const app = new TournamentApp();
window.app = app;
