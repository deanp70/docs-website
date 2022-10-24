/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const isFile = (filepath) => fs.statSync(filepath).isFile();
const isDirectory = (filepath) => fs.statSync(filepath).isDirectory();
const pathJoin = (base) => (filepath) => path.join(base, filepath);

const getDirectories = (filepath) =>
  fs.readdirSync(filepath).map(pathJoin(filepath)).filter(isDirectory);

const getFiles = (filepath) =>
  fs.readdirSync(filepath).map(pathJoin(filepath)).filter(isFile);

const getFilesRecursively = (filepath) =>
  getDirectories(filepath)
    .flatMap(getFilesRecursively)
    .reduce((acc, file) => [...acc, file], getFiles(filepath));

const getAllImageImports = (path) => {
  const files = getFilesRecursively(path);
  const importRegex = new RegExp(`^import.+images.+("|'|';|";)[ ]*$`, 'gm');
  // imported images begin with 'import', contain 'image'
  // and can end in ' or " with or without ; and any number of spaces after
  // eslint-disable-next-line no-useless-escape
  const imgSrcRegex = new RegExp(`<img\s|.*src={.*}`, 'gm');

  const importStatements = files
    .flatMap((file) => {
      if (file === 'src/content/docs/style-guide/images/embed-images.mdx') {
        return null;
      }
      const textfile = fs.readFileSync(file, 'utf-8');
      const imports = textfile.match(importRegex)?.map((importStatement) => {
        return importStatement.split(/'|"/)[0].split(' ')[1];
      });
      const imgSrcs = textfile.match(imgSrcRegex)?.map((source) => {
        return source.split(`src=`)[1].split('}')[0].replace('{', '');
      });
      imgSrcs?.forEach((imgSrc) => {
        if (!imports?.includes(imgSrc)) {
          console.log(
            `\n \x1b[31m${imgSrc}\x1b[0m is used in an img src in \x1b[31m${file}\x1b[0m but never imported`
          );
        }
      });

      return textfile.match(importRegex);
    })
    .filter(Boolean);

  const imageTitles = importStatements.map((importStatement) => {
    return importStatement.split(`'`)[1].split(`/`)[1].replace(/\\/g, '');
    // using replace here as the matched strings have escaped underscores
    // and we need to remove the backslashes
  });

  return imageTitles;
};

const getAllImages = () => {
  const imagesPaths = getFiles('src/images');
  return imagesPaths.map((imagePath) => imagePath.split(`/`)[2]);
};

const recordMissingImages = () => {
  console.log(`\n 🔎 Checking all images, this may take a few moments... \n`);
  const englishImportedImages = getAllImageImports('src/content/docs');
  const i18nImportedImages = getAllImageImports('src/i18n/content');

  const importedImages = englishImportedImages.concat(i18nImportedImages);
  const inRepoImages = getAllImages();

  const orphanImports = importedImages
    .map((imageImport) => {
      if (!inRepoImages.includes(imageImport)) {
        return `\n ${imageImport}`;
      } else return null;
    })
    .filter(Boolean);
  if (orphanImports.length > 0) {
    console.log(
      `\n The following images are imported but do not have a matching file in src/images: \n \x1b[31m${orphanImports}\x1b[0m \n\n please fix the import name or add back the missing image \n`
    );
  } else {
    console.log('🎉 No image import issues found');
  }
};

recordMissingImages();
