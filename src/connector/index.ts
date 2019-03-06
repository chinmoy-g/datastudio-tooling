/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Spinner} from 'cli-spinner';
import {Answers} from '../questions';
import {PWD} from '../index';
import {Template} from '../main';
import * as util from '../util';
import * as appsscript from './appsscript';
import * as path from 'path';
import * as files from '../files';

// TODO - validate that clasp has been authenticated. If not fail, and tell user to auth with clasp.

export const createFromTemplate = async (answers: Answers): Promise<number> => {
  const {
    projectName,
    basePath,
    manifestLogoUrl,
    manifestCompany,
    manifestCompanyUrl,
    manifestAddonUrl,
    manifestSupportUrl,
    manifestDescription,
    manifestSources,
  } = answers;
  const templatePath = path.join(basePath, 'templates', answers.projectChoice);
  const projectPath = path.join(PWD, projectName);
  await files.createAndCopyFiles(projectPath, templatePath, projectName);
  const templates: Template[] = [
    {match: /{{MANIFEST_NAME}}/, replace: projectName},
    {match: /{{MANIFEST_LOGO_URL}}/, replace: manifestLogoUrl},
    {match: /{{MANIFEST_COMPANY}}/, replace: manifestCompany},
    {match: /{{MANIFEST_COMPANY_URL}}/, replace: manifestCompanyUrl},
    {match: /{{MANIFEST_ADDON_URL}}/, replace: manifestAddonUrl},
    {match: /{{MANIFEST_SUPPORT_URL}}/, replace: manifestSupportUrl},
    {match: /{{MANIFEST_DESCRIPTION}}/, replace: manifestDescription},
    {
      match: /{{MANIFEST_SOURCES}}/,
      replace: `[${manifestSources
        .split(',')
        .map((a) => `"${a}"`)
        .join(',')}]`,
    },
  ];
  await files.fixTemplates(projectPath, templates);

  await util.spinnify('Installing project dependencies...', async () => {
    if (answers.yarn) {
      await util.exec('yarn install', {cwd: projectPath}, false);
    } else {
      await util.exec('npm install', {cwd: projectPath}, false);
    }
  });

  await util.spinnify('Creating Apps Script project...', async () => {
    await appsscript.create(projectPath, projectName);
    // Since clasp creating a new project overwrites the manifest, we want to
    // copy the template manifest over the one generated by clasp.
    await util.exec('mv temp/appsscript.json src/appsscript.json', {
      cwd: projectPath,
    });
    await util.exec('rm -r temp', {
      cwd: projectPath,
    });
  });

  await util.spinnify('Pushing template files to Apps Script', async () => {
    await appsscript.push(projectPath);
  });

  console.log(
    `\
cd ${projectName} to start working on your connector!\
`
  );
  return 0;
};
