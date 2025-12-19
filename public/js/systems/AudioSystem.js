export class AudioSystem {
    constructor() {
        // Audio context for advanced features
        this.audioContext = null;
        this.sounds = new Map(); // Loaded sound buffers
        this.soundPools = new Map(); // Pools of audio elements for reuse
        this.music = null; // Background music element
        this.musicTrack = null; // Current music track name
        
        // Volume settings (0.0 to 1.0)
        this.volumes = {
            master: this.loadVolumeSetting('master', 0.7),
            music: this.loadVolumeSetting('music', 0.5),
            sfx: this.loadVolumeSetting('sfx', 0.8)
        };
        
        // Mute settings
        this.muted = {
            master: this.loadMuteSetting('master', false),
            music: this.loadMuteSetting('music', false),
            sfx: this.loadMuteSetting('sfx', false)
        };
        
        // Sound configuration
        this.config = {
            poolSize: 5, // Max concurrent instances per sound
            fadeTime: 1000, // Fade in/out time for music (ms)
            spatialAudioEnabled: false // Can be enabled for 3D positioning
        };
        
        // Track currently playing sounds for cleanup
        this.activeSounds = new Set();
        
        console.log('🔊 AudioSystem initialized');
    }
    
    // Load a sound file into memory
    async loadSound(name, path) {
        try {
            const audio = new Audio(path);
            
            // Create a promise that resolves when audio can play
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject, { once: true });
                audio.load();
            });
            
            this.sounds.set(name, path);
            
            // Create sound pool
            const pool = [];
            for (let i = 0; i < this.config.poolSize; i++) {
                const pooledAudio = new Audio(path);
                pooledAudio.volume = this.getEffectiveVolume('sfx');
                pool.push(pooledAudio);
            }
            this.soundPools.set(name, pool);
            
            console.log(`✅ Loaded sound: ${name}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Failed to load sound: ${name} from ${path}`, error);
            return false;
        }
    }
    
    // Load multiple sounds
    async loadSounds(soundMap) {
        const promises = Object.entries(soundMap).map(([name, path]) => 
            this.loadSound(name, path)
        );
        await Promise.all(promises);
    }
    
    // Play a sound effect
    playSound(name, options = {}) {
        // Check if muted
        if (this.muted.master || this.muted.sfx) {
            return null;
        }
        
        const pool = this.soundPools.get(name);
        if (!pool) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }
        
        // Find available audio element in pool
        const audio = pool.find(a => a.paused || a.ended) || pool[0];
        
        // Configure audio
        audio.currentTime = 0;
        audio.volume = this.getEffectiveVolume('sfx') * (options.volume || 1.0);
        audio.loop = options.loop || false;
        
        // Play
        const playPromise = audio.play();
        if (playPromise) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound: ${name}`, error);
            });
        }
        
        this.activeSounds.add(audio);
        
        // Remove from active sounds when finished
        audio.addEventListener('ended', () => {
            this.activeSounds.delete(audio);
        }, { once: true });
        
        return audio;
    }
    
    // Load and play music
    async loadMusic(name, path) {
        try {
            this.music = new Audio(path);
            this.music.loop = true;
            this.music.volume = this.getEffectiveVolume('music');
            this.musicTrack = name;
            
            await new Promise((resolve, reject) => {
                this.music.addEventListener('canplaythrough', resolve, { once: true });
                this.music.addEventListener('error', reject, { once: true });
                this.music.load();
            });
            
            console.log(`✅ Loaded music: ${name}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Failed to load music: ${name}`, error);
            return false;
        }
    }
    
    // Play background music
    playMusic(fadeIn = true) {
        if (!this.music || this.muted.master || this.muted.music) {
            return;
        }
        
        if (fadeIn) {
            this.music.volume = 0;
            this.music.play().catch(error => {
                console.warn('Failed to play music:', error);
            });
            this.fadeVolume(this.music, this.getEffectiveVolume('music'), this.config.fadeTime);
        } else {
            this.music.volume = this.getEffectiveVolume('music');
            this.music.play().catch(error => {
                console.warn('Failed to play music:', error);
            });
        }
    }
    
    // Stop background music
    stopMusic(fadeOut = true) {
        if (!this.music) return;
        
        if (fadeOut) {
            this.fadeVolume(this.music, 0, this.config.fadeTime, () => {
                this.music.pause();
                this.music.currentTime = 0;
            });
        } else {
            this.music.pause();
            this.music.currentTime = 0;
        }
    }
    
    // Fade audio volume
    fadeVolume(audio, targetVolume, duration, callback) {
        const startVolume = audio.volume;
        const startTime = Date.now();
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            audio.volume = startVolume + (targetVolume - startVolume) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else if (callback) {
                callback();
            }
        };
        
        fade();
    }
    
    // Set volume for a category
    setVolume(category, value) {
        this.volumes[category] = Math.max(0, Math.min(1, value));
        this.saveVolumeSetting(category, this.volumes[category]);
        
        // Update music volume immediately
        if (category === 'music' || category === 'master') {
            if (this.music) {
                this.music.volume = this.getEffectiveVolume('music');
            }
        }
        
        // Update all active SFX volumes
        if (category === 'sfx' || category === 'master') {
            const effectiveVolume = this.getEffectiveVolume('sfx');
            for (const audio of this.activeSounds) {
                audio.volume = effectiveVolume;
            }
        }
    }
    
    // Toggle mute for a category
    toggleMute(category) {
        this.muted[category] = !this.muted[category];
        this.saveMuteSetting(category, this.muted[category]);
        
        // Update volumes
        if (category === 'music' || category === 'master') {
            if (this.music) {
                this.music.volume = this.getEffectiveVolume('music');
            }
        }
        
        if (category === 'sfx' || category === 'master') {
            const effectiveVolume = this.getEffectiveVolume('sfx');
            for (const audio of this.activeSounds) {
                audio.volume = effectiveVolume;
            }
        }
        
        return this.muted[category];
    }
    
    // Get effective volume (considering master and mute)
    getEffectiveVolume(category) {
        if (this.muted.master || this.muted[category]) {
            return 0;
        }
        return this.volumes.master * this.volumes[category];
    }
    
    // Get volume for a category
    getVolume(category) {
        return this.volumes[category];
    }
    
    // Check if category is muted
    isMuted(category) {
        return this.muted[category];
    }
    
    // Save volume setting to localStorage
    saveVolumeSetting(category, value) {
        try {
            localStorage.setItem(`audio_volume_${category}`, value.toString());
        } catch (error) {
            console.warn('Failed to save volume setting:', error);
        }
    }
    
    // Load volume setting from localStorage
    loadVolumeSetting(category, defaultValue) {
        try {
            const saved = localStorage.getItem(`audio_volume_${category}`);
            return saved !== null ? parseFloat(saved) : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }
    
    // Save mute setting to localStorage
    saveMuteSetting(category, value) {
        try {
            localStorage.setItem(`audio_muted_${category}`, value.toString());
        } catch (error) {
            console.warn('Failed to save mute setting:', error);
        }
    }
    
    // Load mute setting from localStorage
    loadMuteSetting(category, defaultValue) {
        try {
            const saved = localStorage.getItem(`audio_muted_${category}`);
            return saved !== null ? saved === 'true' : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }
    
    // Stop all sounds
    stopAllSounds() {
        for (const audio of this.activeSounds) {
            audio.pause();
            audio.currentTime = 0;
        }
        this.activeSounds.clear();
    }
    
    // Cleanup
    destroy() {
        console.log('🔇 AudioSystem cleanup');
        
        // Stop all sounds
        this.stopAllSounds();
        
        // Stop music
        if (this.music) {
            this.music.pause();
            this.music = null;
        }
        
        // Clear pools
        this.soundPools.clear();
        this.sounds.clear();
        
        // Close audio context if exists
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
