/// <reference types="node" />
/**
 * The hosted policy (docs/PRIVACY-POLICY.md) must say the same as the one
 * inside the app.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  privacyPolicy,
  PRIVACY_POLICY_UPDATED,
} from '../src/features/profile/privacyPolicy';

const markdown = readFileSync(
  path.join(__dirname, '..', 'docs', 'PRIVACY-POLICY.md'),
  'utf8',
);

test('docs/PRIVACY-POLICY.md matches the in-app policy', () => {
  expect(markdown).toContain(`Last updated ${PRIVACY_POLICY_UPDATED}`);
  for (const section of privacyPolicy) {
    expect(markdown).toContain(`## ${section.heading}\n\n${section.body}`);
  }
});
