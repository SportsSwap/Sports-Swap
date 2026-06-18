// Shared profanity filter — used by the community feed, marketplace listings and chat
// so objectionable content is blocked everywhere it can be posted (App Store Guideline 1.2).
export const BANNED = new Set([
  'fuck','fucking','fucker','fucked','motherfucker','shit','shitty','bullshit','bitch',
  'asshole','arsehole','ass','arse','bastard','cunt','dick','dickhead','piss','slut',
  'whore','fag','faggot','retard','retarded','nigger','nigga','wank','wanker','prick',
  'twat','douche','cock','bollocks','kike','spic','tranny',
]);

export const hasProfanity = (t: string) =>
  (t || '').toLowerCase().split(/[^a-z]+/).some(w => w && BANNED.has(w));
