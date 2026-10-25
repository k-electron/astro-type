/**
 * `?deck=pixi` draws the Action Deck with PixiJS; without it the DOM deck is
 * played. Read once at startup: switching decks means loading the page again.
 */
export const PIXI_DECK =
  new URLSearchParams(window.location.search).get('deck') === 'pixi';
