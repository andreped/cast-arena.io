# Cast Arena - Audio Assets

This directory contains audio files for the game. All sound effects are sourced from Freesound.org.

## Directory Structure

- `sfx/` - Sound effects
- `music/` - Background music

## Audio Files

### Sound Effects (sfx/)
- `fireball-cast.wav` - Fireball casting sound
- `ring-of-fire-cast.wav` - Ring of Fire casting sound
- `spell-hit.wav` - Spell impact sound
- `explosion.wav` - Explosion sound (also used for player death)
- `respawn.wav` - Player respawn sound
- `pickup-mana.wav` - Mana item pickup
- `pickup-speed.ogg` - Speed item pickup
- `pickup-ring-of-fire.wav` - Ring of Fire item pickup
- `no-mana.wav` - Insufficient mana sound
- `kill.wav` - Kill notification sound

### Music (music/)
- `background.wav` - Main background music (looping)

## Audio Credits

All audio files are sourced from [Freesound.org](https://freesound.org/) - a collaborative database of Creative Commons licensed sounds.

**Important:** These sounds require attribution under Creative Commons licenses. See [LICENSE.md](LICENSE.md) for full author credits and license information.

## Technical Notes

- Audio formats: Primarily `.wav` for consistency, with one `.ogg` file
- The game will work without audio files - it fails gracefully and continues silently
- Audio files are loaded asynchronously and won't block game startup
- The AudioSystem supports sound pooling (5 concurrent instances per sound) for performance
- Volume controls persist to localStorage: Master, Music, and SFX categories
