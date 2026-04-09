# PaperPlacer
PaperPlacer is a web-application for organising and categorising links to files on the internet! The links are separated into catalogues and categories, which are freely accessible through the web-interface.

Possible usecases for the app include grouping links to past exam papers (or their individual questions) to make studying more efficient, or to saving your favourite recipes from across the internet to share with other people, or collecting the scatterred specifications for obscure computer parts to make repairs more straightforward.
### Uploading a Catalogue
Catalogues and categories are, essentially, the same thing — both contain links to files and categories and both use CSV files. The real difference is that **catalogues** appear in the sidebar, they are at the top of the chain; meanwhile **categories** appear inside of catalogues and other categories, they are nested.
#### Short Version
1. Using a spreadsheet processor, create a table with _4 columns_: **Name**, **MIME**, **Link** and **Transcript**
2. Export it as a `CSV` file using **tabulation** field spacing
3. Upload it using the upload page
4. **OR** (optionally) bundle multiple of them together as an archive: create a ZIP file and change `.zip` to `.oc`
##### Example Table
| Name | MIME | Link | Transcript |
|------|------|------|------------|
| Maths Exam Paper | application/pdf | https://example.org/exams/maths_2025.pdf | *sample text* |
| Maths Olympiad Award | image/png | https://personal_website.org/cool_photo.png| Look at me go |
| Match Latte Recipe | video/mp4 | https://cooking.com/matcha.mp4 | *the subtitles basically* |
#### Long Version
In order to upload a catalogue, you first need to create a catalogue. A catalogue consists of categories, and each category must be sent as a CSV file.

To create a CSV, you need to open your spreadsheet processor of choice _(i.e. Microsoft Excel, LibreOffice Calc, Apple Numbers, etc.)_ and create a table with four columns: **Name**, **MIME**, **Link** and **Transcript**.

1.  **Name** is the name you want to give the entry, it can be anything.
2.  **MIME** is the [media type](https://en.wikipedia.org/wiki/Media_type) of the file. It tells the program what type of file it is. You can find a complete list of them [here](https://mime.wcode.net/).
3.  **Link** is the URL to the file itself. Most of the time, it will begin with `https://`
4.  **Transcript** is the transcription of the file. This field isn't mandatory, since images don't necessarily have text, but PDF or DOCX files do. This is used for searching the files.

When saving the file, make sure you save as `CSV` and select field spacing with **tabulation** in the saving settings. Tabulation is used, because it is the preferred spacing setting for importing CSVs to MariaDB.

##### Bundling Uploads
If you want to send multiple files together _as a tree_ (i.e. have categories inside of categories, similar to folders and subfolders on a computer), you can send them as a `ZIP archive`. Your root file must be called `index.csv`. There, you can link to other categories, by putting their **filename** in the _Link_ column and listing _MIME_ as `category`. You can also create folders with files in them. The root `CSV` in each folder also has to be called `index.csv`. When linking to a folder, put the folder's name in _Link_.

![An image showcasing the catalogue tree structure](static/PaperPlacer%20Catalogue%20Structure.svg)

When saving a ZIP file, change the file extension to `.oc` and upload it to this page. `.oc` is used to distinguish the files from other archives. "OC" stands for "Open Catalogue".

###### Specifying Names
The filename will become the name of the category. By default, the catalogue will appear in the sidebar. You can also make it appear as a sub-category inside of an already existing catalogue.

If you are **using Linux, MacOS or BSD**, separate the subcategories using a backslash (`\`), similarly to a file system hierarchy. For example, to place the "Latte" category (links to Latte recipes) inside of "Coffee" inside of "Drinks", you will name the file `Drinks\Coffee\Latte`.

If you are **using Windows**, which restricts filenames more than other OSes, separate the categories with the following string: ` -into- ` (with spaces around the hyphens). Using the above example, the Windows version would look like this: `Drinks -into- Coffee -into- Latte`

**TL;DR**
* Non-Windows version:  `Drinks\Coffee\Latte`
* Windows version:      `Drinks -into- Coffee -into- Latte`
## Installation
### Setting up MariaDB
This project uses `LOAD DATA LOCAL INFILE`, so if your MariaDB provider doesn't allow it or doesn't allow you to set it, you cannot use this application. Assuming you have administrator privileges, here's what you need to do:
1. Create a database
```sql
CREATE DATABASE IF NOT EXISTS PaperPlacer;
USE PaperPlacer;
```
2. Create a user for the app to authenticate as:
```sql
CREATE OR REPLACE USER 'PaperPlacerProgram'@'%' IDENTIFIED BY 'very strong password';
```
If you want a particular configuration for the user, check the [official MariaDB documentation](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user).

3. Grant this user all privileges on this database:
```sql
GRANT ALL PRIVILEGES ON PaperPlacer.* TO 'PaperPlacerProgram'@'%';
```

4. Allow loading local files to the server:
```sql
SET GLOBAL local_infile=1;
```
Note: this change will not persist if you restart MariaDB, therefore if you want to avoid having to enable it if you restart MariaDB frequently, [you should consider configuring MariaDB with option files](https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/configuring-mariadb/configuring-mariadb-with-option-files).

5. Note the host of the database and the credentials somewhere, you will need them later.

### Installing the Web-application
1. Since this is a TypeScript application running on Node, you need to [first install Node](https://nodejs.org/en/download), if you haven't already. The app is using Node 22.
2. Go to your desired installation location and either unpack a release or clone the repository with
```bash
git clone https://github.com/lucacelee/PaperPlacer.git
cd PaperPlacer
```
3. Install the dependencies
```bash
npm install
```
4. Build the application
```bash
npm run build
```
5. Use `.env.example` to create your own `.env` file with your credentials
6. Run the app
```bash
npm run start
```
7. Using an HTTP server software of your choice (e.g. Apache or Nginx), set up a redirection to the PaperPlacer port (specified in `.env`) for users accessing a specific domain.
