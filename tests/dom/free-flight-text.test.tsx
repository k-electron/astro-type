import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FREE_FLIGHT_EMPTY_TEXT_MESSAGE,
  FreeFlightTextSchema,
} from '../../src/curriculum/curriculum';
import { START_FREE_FLIGHT, YOUR_TEXT } from '../shared/screens';
import { renderGame, screen } from './harness';

const ROCKET = String.fromCodePoint(0x1f680);
const FAMILY = String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);

/** Free Flight, open, with `text` in the text box. */
function freeFlightWith(text: string) {
  const player = renderGame();
  player.openHeader('Free Flight');
  fireEvent.change(screen.getByRole('textbox', { name: YOUR_TEXT }), {
    target: { value: text },
  });
  return player;
}

const startButton = () =>
  screen.getByRole('button', { name: START_FREE_FLIGHT }) as HTMLButtonElement;

/** What the text check says about `text`, the message the player should read. */
function messageFor(text: string): string {
  const result = FreeFlightTextSchema.safeParse(text);
  if (result.success) throw new Error('The text was meant to be refused');
  return result.error.issues[0].message;
}

describe('Free Flight tells you why you cannot start', () => {
  it.each([
    ['empty', ''],
    ['only whitespace', ' \n\t '],
  ])(
    'says to enter some text when the box is %s, and will not start',
    (_, text) => {
      freeFlightWith(text);

      expect(screen.getByText(FREE_FLIGHT_EMPTY_TEXT_MESSAGE)).toBeTruthy();
      expect(startButton().disabled).toBe(true);
    },
  );

  it('says nothing, and can start, while the text is fine', () => {
    freeFlightWith('ready to launch');

    expect(screen.queryByText(FREE_FLIGHT_EMPTY_TEXT_MESSAGE)).toBeNull();
    expect(startButton().disabled).toBe(false);
  });

  it('shows what the text check says about a character with no key, and will not start', () => {
    const text = `ready ${ROCKET} launch`;
    freeFlightWith(text);

    expect(screen.getByText(messageFor(text))).toBeTruthy();
    expect(startButton().disabled).toBe(true);
  });

  it('names a family emoji once, as itself, not as its pieces', () => {
    const text = `ready ${FAMILY} launch`;
    freeFlightWith(text);

    const message = screen.getByText(messageFor(text)).textContent ?? '';
    // Once, as itself (two parts around it means exactly one occurrence).
    expect(message.split(FAMILY)).toHaveLength(2);
    expect(message).not.toMatch(/U\+200D/);
    expect(startButton().disabled).toBe(true);
  });

  it('puts the message right under the text box, above the count', () => {
    const text = `ready ${ROCKET} launch`;
    freeFlightWith(text);

    const textbox = screen.getByRole('textbox', { name: YOUR_TEXT });
    const message = screen.getByText(messageFor(text));
    const count = screen.getByText(/Approx\./);
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(follows(textbox, message)).toBe(true);
    expect(follows(message, count)).toBe(true);
  });
});

describe('Free Flight counts words', () => {
  it('reads Approx. 0 words for an empty box', () => {
    freeFlightWith('');

    expect(screen.getByText(/Approx\./).textContent).toMatch(
      /Approx\.\s*0\s*words/,
    );
  });
});
