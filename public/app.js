// Raag Recording System - Frontend Application
class RaagRecordingApp {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.init();
    }

    init() {
        this.initEventListeners();
        this.checkAuthentication();
    }

    initEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Audio modals
        document.getElementById('closeAudioModal').addEventListener('click', () => {
            this.closeAudioModal();
        });

        // Upload modal
        document.getElementById('uploadTrackBtn').addEventListener('click', () => {
            this.showUploadModal();
        });

        document.getElementById('cancelUpload').addEventListener('click', () => {
            this.hideUploadModal();
        });

        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadAudioFile();
        });

        // Message form
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Search and filters
        document.getElementById('shabadSearch').addEventListener('input', (e) => {
            this.searchShabads(e.target.value);
        });

        document.getElementById('raagFilter').addEventListener('change', (e) => {
            this.filterByRaag(e.target.value);
        });
    }

    async checkAuthentication() {
        const token = localStorage.getItem('raag_token');
        if (token) {
            try {
                const response = await this.apiCall('/api/auth/me', 'GET');
                if (response.success) {
                    this.currentUser = response.user;
                    this.showMainContent();
                    this.initializeSocket();
                    this.loadDashboard();
                    return;
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
            }
        }
        this.showLogin();
    }

    async login() {
        const username = document.getElementById('username').value;
        const role = document.getElementById('role').value;

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', {
                username,
                role
            });

            if (response.success) {
                this.currentUser = response.user;
                localStorage.setItem('raag_token', response.token);
                this.showMainContent();
                this.initializeSocket();
                this.loadDashboard();
            } else {
                alert('Login failed: ' + response.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    logout() {
        localStorage.removeItem('raag_token');
        this.currentUser = null;
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        
        // Update user info
        document.getElementById('userName').textContent = this.currentUser.full_name || this.currentUser.username;
        document.getElementById('userRole').textContent = `(${this.currentUser.role})`;
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');

        // Show/hide tabs based on role
        this.updateRoleBasedUI();
    }

    updateRoleBasedUI() {
        const role = this.currentUser.role;
        
        // Hide all role-specific elements first
        document.querySelectorAll('.performer-only, .approver-only, .mixer-only, .narrator-only, .admin-only').forEach(el => {
            el.style.display = 'none';
        });

        // Show elements for current role
        document.querySelectorAll(`.${role}-only`).forEach(el => {
            el.style.display = 'block';
        });

        // Show recordings tab for performers and mixers
        if (['performer', 'mixer'].includes(role)) {
            document.querySelector('[data-tab="recordings"]').style.display = 'block';
        }

        // Show approvals tab for approvers
        if (role === 'approver') {
            document.querySelector('[data-tab="approvals"]').style.display = 'block';
        }
    }

    initializeSocket() {
        this.socket = io();
        
        // Join role-based room
        this.socket.emit('join_role_room', this.currentUser.role);

        // Listen for real-time updates
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('approval_status_changed', (approval) => {
            this.handleApprovalUpdate(approval);
        });

        this.socket.on('new_track_uploaded', (track) => {
            this.handleNewTrack(track);
        });
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active', 'text-indigo-600', 'border-indigo-600');
            tab.classList.add('text-gray-500');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        activeTab.classList.add('active', 'text-indigo-600', 'border-indigo-600');
        activeTab.classList.remove('text-gray-500');

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        document.getElementById(`${tabName}-tab`).classList.remove('hidden');

        // Load content for the tab
        this.loadTabContent(tabName);
    }

    async loadTabContent(tabName) {
        switch (tabName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'shabads':
                await this.loadShabads();
                break;
            case 'recordings':
                await this.loadRecordings();
                break;
            case 'approvals':
                await this.loadApprovals();
                break;
            case 'communications':
                await this.loadCommunications();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load dashboard statistics
            const [recordingStats, approvalStats] = await Promise.all([
                this.apiCall('/api/recordings/statistics'),
                this.apiCall('/api/approvals/statistics')
            ]);

            // Update dashboard cards
            document.getElementById('totalSessions').textContent = recordingStats.statistics.totalSessions;
            document.getElementById('totalShabads').textContent = '1430'; // Approximate number of shabads in SGGS
            
            const pendingCount = approvalStats.statistics.approvalsByStatus.find(s => s.status === 'pending')?.count || 0;
            document.getElementById('pendingApprovals').textContent = pendingCount;

            // Load recent activity
            await this.loadRecentActivity();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadShabads() {
        try {
            const response = await this.apiCall('/api/shabads?limit=50');
            const raagResponse = await this.apiCall('/api/shabads/raags/all');

            if (response.success) {
                this.renderShabads(response.shabads);
            }

            if (raagResponse.success) {
                this.populateRaagFilter(raagResponse.raags);
            }
        } catch (error) {
            console.error('Error loading shabads:', error);
        }
    }

    renderShabads(shabads) {
        const container = document.getElementById('shabadsList');
        
        if (shabads.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No shabads found.</p>';
            return;
        }

        container.innerHTML = shabads.map(shabad => `
            <div class="raag-card bg-white border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-lg text-gray-900">${shabad.first_line}</h3>
                        <p class="text-sm text-gray-600">Ang ${shabad.ang_number} • ${shabad.raag_name} • ${shabad.guru_author}</p>
                    </div>
                    <div class="flex space-x-2">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            ${shabad.session_count} sessions
                        </span>
                        ${shabad.completed_count > 0 ? 
                            '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>' : 
                            '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">In Progress</span>'
                        }
                    </div>
                </div>
                <div class="flex justify-between items-center mt-4">
                    <button onclick="app.viewShabad(${shabad.id})" 
                            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        View Details →
                    </button>
                    ${this.currentUser.role === 'performer' ? 
                        `<button onclick="app.startRecordingSession(${shabad.id})" 
                                class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
                            Start Recording
                        </button>` : ''
                    }
                </div>
            </div>
        `).join('');
    }

    populateRaagFilter(raags) {
        const select = document.getElementById('raagFilter');
        select.innerHTML = '<option value="">All Raags</option>' + 
            raags.map(raag => `<option value="${raag.id}">${raag.name} (${raag.shabad_count} shabads)</option>`).join('');
    }

    async loadRecordings() {
        try {
            const response = await this.apiCall('/api/recordings/tracks/pending-approval');
            
            if (response.success) {
                this.renderRecordings(response.pendingTracks);
            }
        } catch (error) {
            console.error('Error loading recordings:', error);
        }
    }

    renderRecordings(tracks) {
        const container = document.getElementById('recordingsList');
        
        if (tracks.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No recordings found.</p>';
            return;
        }

        container.innerHTML = tracks.map(track => `
            <div class="border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold">${track.track_name}</h3>
                        <p class="text-sm text-gray-600">
                            ${track.shabad_first_line} • ${track.raag_name} • ${track.performer_name}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                            ${track.instrument} • ${track.track_type} • ${this.formatDuration(track.duration_seconds)}
                        </p>
                    </div>
                    <span class="status-${track.approval_status} font-medium text-sm">
                        ${track.approval_status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                <div class="flex space-x-2 mt-3">
                    <button onclick="app.playAudio('track', ${track.id}, '${track.track_name}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-play mr-1"></i>Play
                    </button>
                    ${this.currentUser.role === 'mixer' && track.approval_status === 'approved' ?
                        `<button onclick="app.startMixing(${track.id})"
                                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                            Start Mixing
                        </button>` : ''
                    }
                </div>
            </div>
        `).join('');
    }

    async loadApprovals() {
        if (this.currentUser.role !== 'approver') return;

        try {
            const response = await this.apiCall(`/api/approvals/pending/${this.currentUser.id}`);
            
            if (response.success) {
                this.renderApprovals(response.pendingApprovals);
            }
        } catch (error) {
            console.error('Error loading approvals:', error);
        }
    }

    renderApprovals(approvals) {
        const container = document.getElementById('approvalsList');
        
        if (approvals.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No pending approvals.</p>';
            return;
        }

        container.innerHTML = approvals.map(approval => {
            const details = approval.item_details;
            return `
                <div class="border border-gray-200 rounded-lg p-6 mb-4">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-bold text-lg">${details.track_name || details.narrator_name || 'Mixed Track'}</h3>
                            <p class="text-gray-600">${details.shabad_first_line} • ${details.raag_name}</p>
                            <p class="text-sm text-gray-500 mt-1">
                                Type: ${approval.item_type} • 
                                ${approval.item_type === 'track' ? `Performer: ${details.performer_name}` : ''}
                                ${approval.item_type === 'narrator_recording' ? `Narrator: ${details.narrator_name}` : ''}
                            </p>
                        </div>
                        <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                            Pending Review
                        </span>
                    </div>
                    
                    <div class="flex space-x-3 mb-4">
                        <button onclick="app.playAudio('${approval.item_type}', ${approval.item_id}, '${details.track_name || 'Audio'}')"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-play mr-2"></i>Listen
                        </button>
                    </div>
                    
                    <div class="border-t pt-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button onclick="app.approveItem(${approval.id}, 'approved')"
                                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
                                <i class="fas fa-check mr-2"></i>Approve
                            </button>
                            <button onclick="app.approveItem(${approval.id}, 'rejected')"
                                    class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
                                <i class="fas fa-times mr-2"></i>Reject
                            </button>
                            <button onclick="app.approveItem(${approval.id}, 'needs_revision')"
                                    class="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded">
                                <i class="fas fa-edit mr-2"></i>Needs Revision
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadCommunications() {
        try {
            const [messages, users] = await Promise.all([
                this.apiCall(`/api/communications/user/${this.currentUser.id}`),
                this.apiCall('/api/users')
            ]);

            if (messages.success) {
                this.renderMessages(messages.messages);
            }

            if (users.success) {
                this.populateMessageRecipients(users.users);
            }
        } catch (error) {
            console.error('Error loading communications:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        
        if (messages.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No messages found.</p>';
            return;
        }

        container.innerHTML = messages.map(message => `
            <div class="border border-gray-200 rounded-lg p-4 mb-3 ${!message.read_at ? 'bg-blue-50 border-blue-200' : ''}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-medium">${message.subject}</h4>
                        <p class="text-sm text-gray-600">From: ${message.from_user_name} (${message.from_user_role})</p>
                    </div>
                    <span class="text-xs text-gray-500">${this.formatDate(message.sent_at)}</span>
                </div>
                <p class="text-gray-700">${message.message}</p>
                ${!message.read_at ? 
                    `<button onclick="app.markAsRead(${message.id})" 
                            class="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                        Mark as Read
                    </button>` : ''
                }
            </div>
        `).join('');
    }

    populateMessageRecipients(users) {
        const select = document.getElementById('messageRecipient');
        const otherUsers = users.filter(user => user.id !== this.currentUser.id);
        
        select.innerHTML = '<option value="">Select recipient</option>' + 
            otherUsers.map(user => `<option value="${user.id}">${user.full_name} (${user.role})</option>`).join('');
    }

    async playAudio(type, id, title) {
        try {
            const response = await this.apiCall(`/api/download/${type}/${id}`);
            
            if (response.downloadUrl) {
                document.getElementById('audioTitle').textContent = title;
                document.getElementById('audioPlayer').src = response.downloadUrl;
                document.getElementById('audioModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading audio:', error);
            alert('Failed to load audio file');
        }
    }

    closeAudioModal() {
        document.getElementById('audioModal').classList.add('hidden');
        document.getElementById('audioPlayer').pause();
        document.getElementById('audioPlayer').src = '';
    }

    showUploadModal() {
        document.getElementById('uploadModal').classList.remove('hidden');
    }

    hideUploadModal() {
        document.getElementById('uploadModal').classList.add('hidden');
        document.getElementById('uploadForm').reset();
    }

    async uploadAudioFile() {
        const formData = new FormData();
        const audioFile = document.getElementById('audioFile').files[0];
        const trackName = document.getElementById('trackName').value;
        const instrument = document.getElementById('instrument').value;
        const trackType = document.getElementById('trackType').value;

        if (!audioFile) {
            alert('Please select an audio file');
            return;
        }

        formData.append('audioFile', audioFile);
        formData.append('fileType', 'raw_track');
        formData.append('metadata', JSON.stringify({
            shabadId: 1, // This would be selected in a real implementation
            sessionId: 1, // This would be selected in a real implementation
            trackNumber: 1,
            performer: this.currentUser.username
        }));

        // Show progress
        document.getElementById('uploadProgress').classList.remove('hidden');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('raag_token')}`
                }
            });

            const result = await response.json();

            if (result.success) {
                // Add track to database
                await this.apiCall('/api/recordings/tracks', 'POST', {
                    sessionId: 1, // This would be selected
                    trackNumber: 1,
                    trackName,
                    performerId: this.currentUser.id,
                    instrument,
                    trackType,
                    s3Key: result.s3Key,
                    s3Bucket: 'raag-recordings',
                    fileSizeMb: result.fileSize / (1024 * 1024),
                    durationSeconds: 0, // Would be calculated
                    recordingQuality: 'good'
                });

                alert('Track uploaded successfully!');
                this.hideUploadModal();
                this.loadRecordings();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            document.getElementById('uploadProgress').classList.add('hidden');
        }
    }

    async sendMessage() {
        const toUserId = document.getElementById('messageRecipient').value;
        const subject = document.getElementById('messageSubject').value;
        const message = document.getElementById('messageContent').value;

        try {
            const response = await this.apiCall('/api/communications/send', 'POST', {
                fromUserId: this.currentUser.id,
                toUserId,
                subject,
                message
            });

            if (response.success) {
                alert('Message sent successfully!');
                document.getElementById('messageForm').reset();
                this.loadCommunications();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    }

    async approveItem(approvalId, status) {
        const comments = prompt(`Please add comments for this ${status} decision:`);
        
        try {
            const response = await this.apiCall('/api/approvals/decision', 'POST', {
                approvalId,
                approverId: this.currentUser.id,
                status,
                comments
            });

            if (response.success) {
                alert('Approval decision submitted successfully!');
                this.loadApprovals();
            }
        } catch (error) {
            console.error('Error submitting approval:', error);
            alert('Failed to submit approval decision');
        }
    }

    async markAsRead(communicationId) {
        try {
            await this.apiCall(`/api/communications/read/${communicationId}`, 'PUT');
            this.loadCommunications();
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    // Event handlers for real-time updates
    handleNewMessage(message) {
        // Show notification or update UI
        console.log('New message received:', message);
    }

    handleApprovalUpdate(approval) {
        // Refresh approvals if on that tab
        if (document.getElementById('approvals-tab').classList.contains('hidden') === false) {
            this.loadApprovals();
        }
    }

    handleNewTrack(track) {
        // Refresh recordings if on that tab
        if (document.getElementById('recordings-tab').classList.contains('hidden') === false) {
            this.loadRecordings();
        }
    }

    // Utility functions
    async apiCall(endpoint, method = 'GET', body = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('raag_token')}`
            }
        };

        if (body && method !== 'GET') {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(endpoint, config);
        return await response.json();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async searchShabads(query) {
        try {
            const response = await this.apiCall(`/api/shabads?search=${encodeURIComponent(query)}&limit=50`);
            if (response.success) {
                this.renderShabads(response.shabads);
            }
        } catch (error) {
            console.error('Error searching shabads:', error);
        }
    }

    async filterByRaag(raagId) {
        try {
            const url = raagId ? `/api/shabads/raag/${raagId}` : '/api/shabads?limit=50';
            const response = await this.apiCall(url);
            if (response.success) {
                this.renderShabads(response.shabads);
            }
        } catch (error) {
            console.error('Error filtering by raag:', error);
        }
    }

    async loadRecentActivity() {
        // This would fetch recent activity from the API
        const recentActivity = document.getElementById('recentActivity');
        recentActivity.innerHTML = `
            <div class="text-sm text-gray-600">
                <p class="mb-2"><i class="fas fa-microphone text-green-500 mr-2"></i>New track uploaded for Raag Asa</p>
                <p class="mb-2"><i class="fas fa-check text-blue-500 mr-2"></i>Track approved in Raag Gujari</p>
                <p class="mb-2"><i class="fas fa-mix text-purple-500 mr-2"></i>Mixed track ready for final review</p>
            </div>
        `;
    }
}

// Initialize the application
const app = new RaagRecordingApp();

// Add some CSS for navigation tabs
const style = document.createElement('style');
style.textContent = `
    .nav-tab {
        padding: 0.75rem 1rem;
        border-bottom: 2px solid transparent;
        color: #6b7280;
        font-medium: 500;
        transition: all 0.2s;
        cursor: pointer;
        background: none;
        border-left: none;
        border-right: none;
        border-top: none;
    }
    
    .nav-tab:hover {
        color: #4f46e5;
        border-bottom-color: #e5e7eb;
    }
    
    .nav-tab.active {
        color: #4f46e5;
        border-bottom-color: #4f46e5;
    }
`;
document.head.appendChild(style);