/*
 * insert_emoji.tsx
 *
 * Copyright (C) 2019-20 by RStudio, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */

import { Schema } from 'prosemirror-model';
import { PluginKey, EditorState } from 'prosemirror-state';
import { ProsemirrorCommand, EditorCommandId } from '../../api/command';

import { EditorEvents } from '../../api/events';
import { Extension } from '../../api/extension';
import { EditorFormat } from '../../api/format';
import { EditorOptions } from '../../api/options';
import { PandocExtensions } from '../../api/pandoc';
import { PandocCapabilities } from '../../api/pandoc_capabilities';
import { EditorUI } from '../../api/ui';

import { performInsertSymbol, InsertSymbolPlugin } from './insert_symbol-plugin';
import { SymbolDataProvider, SymbolCharacter } from './insert_symbol-dataprovider';
import { emojiCategories, emojis, Emoji, emojiFromString, SkinTone } from '../../api/emoji';

const key = new PluginKey<boolean>('insert-emoji');

const extension = (
  _pandocExtensions: PandocExtensions,
  _pandocCapabilities: PandocCapabilities,
  ui: EditorUI,
  _format: EditorFormat,
  _options: EditorOptions,
  events: EditorEvents,
): Extension => {
  return {
    commands: () => {
      return [new ProsemirrorCommand(EditorCommandId.Emoji, [], performInsertSymbol(key))];
    },
    plugins: (_schema: Schema) => {
      return [new InsertSymbolPlugin(key, new EmojiSymbolDataProvider(ui), ui, events)];
    },
  };
};


export class EmojiSymbolDataProvider implements SymbolDataProvider {
  
  public constructor(ui: EditorUI) {
    this.ui = ui;
  }
  private readonly ui: EditorUI;

  public readonly filterPlaceholderHint = 'emoji name';
  
  public insertSymbolTransaction(symbolCharacter: SymbolCharacter, searchTerm: string, state: EditorState) {
    
    const emoji = emojiFromString(symbolCharacter.value, this.skinTone());   
    const tr = state.tr;
    if (emoji) {
      // Try to find an alias that matches the user's search term
      const bestAlias = emoji.aliases.find(alias => alias.includes(searchTerm));
      const mark = state.schema.marks.emoji.create({ emojihint: bestAlias || emoji.aliases[0]});
      const text = state.schema.text(emoji.emoji, [mark]);
      tr.replaceSelectionWith(text, false); 
    } else {
      // This doesn't appear to be an emoji or it doesn't have a markdown representation, 
      // just insert the text
      tr.insertText(symbolCharacter.value);
    }
    return tr;
  }
  
  public symbolGroupNames(): string[] {
    return [kCategoryAll, ...emojiCategories()];
  }

  public getSymbols(groupName: string | undefined) {
    if (groupName === kCategoryAll || groupName === undefined) {
      return emojis(this.skinTone())
              .map(emoji => symbolForEmoji(emoji));
    }  else {
      return emojis(this.skinTone())
              .filter(emoji => emoji.category === groupName)
              .map(emoji => symbolForEmoji(emoji));
    }
  }

  public filterSymbols(filterText: string, symbols: SymbolCharacter[]): SymbolCharacter[] {
    const filteredSymbols = symbols.filter(symbol => {
      // Search by name
      if (symbol.name.includes(filterText)) {
        return true;
      }

      // search each of the aliases
      if (symbol.aliases && symbol.aliases.find(alias => alias.includes(filterText))) {
        return true;
      }

      return false;
    });
    return filteredSymbols;
  }

  private skinTone() : SkinTone {
    return this.ui.prefs.emojiSkinTone();
  }
 }

const kCategoryAll = 'All';
function symbolForEmoji(emoji: Emoji) : SymbolCharacter {
  return ({ 
    name: `${emoji.hasMarkdownRepresentation ? ':' + emoji.aliases[0] + ':' : emoji.emoji}`,
    value: emoji.emoji,
    aliases: emoji.aliases,
    description: emoji.description
  });
}

export default extension;
