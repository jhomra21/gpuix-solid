/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tailwind CSS template literal tag for IntelliSense support.
 * The Tailwind IntelliSense extension recognizes `tw` tagged template literals
 * and provides autocomplete and validation.
 */
export function tw(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ?? '')
  }, '')
}

