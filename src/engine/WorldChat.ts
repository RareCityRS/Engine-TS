import WordEnc from '#/cache/wordenc/WordEnc.js';
import World from '#/engine/World.js';

import type Player from '#/engine/entity/Player.js';

// --- World chat (RNG City custom) --------------------------------------------
// Lets players broadcast a message to everyone online, either with
// `::w <message>` / `::world <message>`, or by starting a public chat message
// with `//`.
//
// A note on the `//` trigger: '/' is not in the 2004 client's wordpack charset,
// so the client encodes each '/' as a space before the message ever reaches us.
// A message typed as `//hello` therefore arrives as '  hello' (two leading
// spaces), and that artifact is what we detect. Any other unsupported character
// (~ _ < > etc.) also encodes to a space, so `~~hello` or a deliberate double
// space triggers world chat too. If that causes false positives in practice,
// set WORLD_CHAT_SLASH_TRIGGER to false and keep the ::w command.
//
// Delivery is via MESSAGE_GAME (chatbox game message). The stock client draws
// these in plain black and does not evaluate @col@ tags in the chatbox, so the
// visual distinction comes from the '[World] Name:' prefix rather than colour.
// ------------------------------------------------------------------------------

export const WORLD_CHAT_ENABLED: boolean = true;
export const WORLD_CHAT_SLASH_TRIGGER: boolean = true;

// world ticks are 600ms; 10 ticks = one message per player per 6 seconds.
const WORLD_CHAT_COOLDOWN_TICKS: number = 10;

// keep the player-typed portion within the same bounds as normal chat input.
const WORLD_CHAT_MAX_LENGTH: number = 80;

// the client special-cases game messages ending with these suffixes (it turns
// them into trade/duel request lines), so a crafted world message must never
// end with one of them.
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

    World.broadcastMes(formatted);

    // piggyback on the public chat logging pipeline: the world tick loop logs
    // player.logMessage to the public_chat table after packet processing.
    player.logMessage = `[World] ${message}`;
}
