/** Path to a team's logo under /public/teams, keyed by the same abbreviation stored on games. */
export function teamLogoSrc(abbr: string): string {
  return `/teams/${abbr}.png`;
}
