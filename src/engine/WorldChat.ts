import WordEnc from '#/cache/wordenc/WordEnc.js';
import World from '#/engine/World.js';

import type Player from '#/engine/entity/Player.js';

// RNG City world chat: broadcast a message with `::w <message>`, `::world <message>` or `//`
export const WORLD_CHAT_ENABLED: boolean = true;
export const WORLD_CHAT_SLASH_TRIGGER: boolean = true;

// world ticks are 600ms; 10 ticks = one message per player per 6 seconds.
const WORLD_CHAT_COOLDOWN_TICKS: number = 10;

// keep the player-typed portion within the same bounds as normal chat input.
const WORLD_CHAT_MAX_LENGTH: number = 80;

// crafted world message must never end with these suffixes
const MAGIC_SUFFIXES: string[] = [':tradereq:', ':duelreq:'];

export function sendWorldChat(player: Player, input: string): void {
    if (!WORLD_CHAT_ENABLED) {
        player.messageGame('World chat is currently disabled.');
        return;
    }

    if (player.muted_until !== null && player.muted_until > new Date()) {
        return;
    }

    const message: string = input.trim().substring(0, WORLD_CHAT_MAX_LENGTH);
    if (message.length === 0) {
        player.messageGame('Usage: ::w <message> - or start a public message with //');
        return;
    }

    const elapsed: number = World.currentTick - player.worldChatTick;
    if (elapsed < WORLD_CHAT_COOLDOWN_TICKS) {
        const seconds: number = Math.ceil((WORLD_CHAT_COOLDOWN_TICKS - elapsed) * 0.6);
        player.messageGame(`You can send another world chat message in ${seconds} second${seconds === 1 ? '' : 's'}.`);
        return;
    }
    player.worldChatTick = World.currentTick;

    let formatted: string = `[World] ${player.displayName}: ${WordEnc.filter(message)}`;
    for (const suffix of MAGIC_SUFFIXES) {
        if (formatted.endsWith(suffix)) {
            formatted += ' ';
            break;
        }
    }

    for (const target of World.players) {
        if (target && !target.worldChatOff) {
            target.wrappedMessageGame(formatted);
        }
    }
    
    player.logMessage = `[World] ${message}`;
}