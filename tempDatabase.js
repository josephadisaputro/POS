const fs = require('fs')
const util = require('util')
const path = require('path')
const xlsx = require('xlsx')
const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)
const readdir = util.promisify(fs.readdir)

class tempDatabase {
    constructor() {
        this.lock = false;
    }

    async deleteRow(filename, searchKey, searchValue) {
        if (!filename || !searchKey || !searchValue) {
            throw new Error("Missing required parameters: filename, searchKey, or searchValue");
        }

        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.lock = true;

        try {
            const files = await readdir(__dirname + '/db');
            const filenameFiles = files.filter(file => file.startsWith(filename) && file.endsWith('.xlsx'));
            if (filenameFiles.length === 0) {
                throw new Error("File not found, deletion cancelled");
            }

            filenameFiles.sort();
            const lastFile = filenameFiles[filenameFiles.length - 1];
            const filePath = path.join(__dirname, '/db', lastFile);
            const workbook = xlsx.readFile(filePath);
            let fileData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            const index = fileData.findIndex(item => item[searchKey] === searchValue);
            if (index === -1) {
                throw new Error("Data not found, deletion cancelled");
            }

            fileData.splice(index, 1);
            const newWorkbook = xlsx.utils.book_new();
            const newWorksheet = xlsx.utils.json_to_sheet(fileData);
            xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
            xlsx.writeFile(newWorkbook, filePath);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            this.lock = false;
        }
    }

    async update(filename, payload, searchKey, searchValue) {
        if (!filename || !searchKey || !searchValue) {
            throw new Error("Missing required parameters: filename, searchKey, or searchValue");
        }

        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.lock = true;

        try {
            const files = await readdir(__dirname + '/db');
            const filenameFiles = files.filter(file => file.startsWith(filename) && file.endsWith('.xlsx'));
            if (filenameFiles.length === 0) {
                throw new Error("File not found, update cancelled");
            }

            filenameFiles.sort();
            let allKeys = new Set();

            for (let file of filenameFiles) {
                const workbook = xlsx.readFile(path.join(__dirname, '/db', file));
                const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                jsonData.forEach(item => {
                    Object.keys(item).forEach(key => allKeys.add(key));
                });
            }

            // Add missing keys to payload
            allKeys.forEach(key => {
                if (!payload.hasOwnProperty(key)) {
                    payload[key] = null;
                }
            });

            // Add new keys to existing data
            Object.keys(payload).forEach(key => {
                if (!allKeys.has(key)) {
                    filenameFiles.forEach(async file => {
                        const filePath = path.join(__dirname, '/db', file);
                        const workbook = xlsx.readFile(filePath);
                        let fileData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        fileData.forEach(item => {
                            item[key] = null;
                        });
                        const newWorkbook = xlsx.utils.book_new();
                        const newWorksheet = xlsx.utils.json_to_sheet(fileData);
                        xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
                        xlsx.writeFile(newWorkbook, filePath);
                    });
                }
            });

            const lastFile = filenameFiles[filenameFiles.length - 1];
            const filePath = path.join(__dirname, '/db', lastFile);
            const workbook = xlsx.readFile(filePath);
            let fileData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            const index = fileData.findIndex(item => item[searchKey] === searchValue);
            if (index === -1) {
                throw new Error("Data not found, update cancelled");
            }

            fileData[index] = payload;
            const newWorkbook = xlsx.utils.book_new();
            const newWorksheet = xlsx.utils.json_to_sheet(fileData);
            xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
            xlsx.writeFile(newWorkbook, filePath);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            this.lock = false;
        }
    }

    async write(filename, payload) {
        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.lock = true;

        try {
            const files = await readdir(__dirname + '/db');
            const filenameFiles = files.filter(file => file.startsWith(filename) && file.endsWith('.xlsx'));
            let targetFile = `${filename}-1.xlsx`;
            let allKeys = new Set();

            if (filenameFiles.length > 0) {
                filenameFiles.sort();
                for (let file of filenameFiles) {
                    const workbook = xlsx.readFile(path.join(__dirname, '/db', file));
                    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    jsonData.forEach(item => {
                        Object.keys(item).forEach(key => allKeys.add(key));
                    });
                }

                const lastFile = filenameFiles[filenameFiles.length - 1];
                const workbook = xlsx.readFile(path.join(__dirname, '/db', lastFile));
                const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                if (jsonData.length < 10) {
                    targetFile = lastFile;
                } else {
                    const fileNumber = parseInt(lastFile.replace(filename + '-', '').replace('.xlsx', ''));
                    targetFile = `${filename}-${fileNumber + 1}.xlsx`;
                }
            }

            const filePath = path.join(__dirname, '/db', targetFile);
            let fileData = [];

            if (fs.existsSync(filePath)) {
                const workbook = xlsx.readFile(filePath);
                fileData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            }

            // Add missing keys to payload
            allKeys.forEach(key => {
                if (!payload.hasOwnProperty(key)) {
                    payload[key] = null;
                }
            });

            // Add new keys to existing data
            Object.keys(payload).forEach(key => {
                if (!allKeys.has(key)) {
                    fileData.forEach(item => {
                        item[key] = null;
                    });
                }
            });

            fileData.push(payload);
            const newWorkbook = xlsx.utils.book_new();
            const newWorksheet = xlsx.utils.json_to_sheet(fileData);
            xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
            xlsx.writeFile(newWorkbook, filePath);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            this.lock = false;
        }
    }

    async read(filename, page = -1, size = -1, searchKey = null, searchValue = null) {
        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.lock = true;

        try {
            const files = await readdir(__dirname + '/db');
            const filenameFiles = files.filter(file => file.startsWith(filename) && file.endsWith('.xlsx'));
            filenameFiles.sort();

            let allData = [];

            for (let file of filenameFiles) {
                const workbook = xlsx.readFile(path.join(__dirname, '/db', file));
                const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                allData = allData.concat(jsonData);
            }

            if (searchKey !== null && searchValue !== null) {
                const foundObject = allData.find(obj => obj[searchKey] === searchValue);
                return foundObject ? [foundObject] : [];
            }

            if (page === -1 && size === -1) {
                return allData;
            }

            const start = (page - 1) * size;
            const end = start + size;

            return allData.slice(start, end);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            this.lock = false;
        }
    }

    
}

module.exports = tempDatabase;