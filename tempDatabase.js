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
            let deleted = false;
    
            for (let file of filenameFiles) {
                const filePath = path.join(__dirname, '/db', file);
                let fileData = await this.read(file, -1, -1, null, null);
    
                const index = fileData.findIndex(item => item[searchKey] === searchValue);
                if (index !== -1) {
                    fileData.splice(index, 1);
                    const newWorkbook = xlsx.utils.book_new();
                    const newWorksheet = xlsx.utils.json_to_sheet(fileData);
                    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
                    xlsx.writeFile(newWorkbook, filePath);
                    deleted = true;
                    break;
                }
            }
    
            if (!deleted) {
                throw new Error("Data not found, deletion cancelled");
            }
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
            let updated = false;
    
            for (let file of filenameFiles) {
                const filePath = path.join(__dirname, '/db', file);
                const workbook = xlsx.readFile(filePath);
                let fileData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const index = fileData.findIndex(item => item[searchKey] === searchValue);
    
                if (index !== -1) {
                    // Add missing keys to payload
                    Object.keys(fileData[index]).forEach(key => {
                        if (!payload.hasOwnProperty(key)) {
                            payload[key] = null;
                        }
                    });
    
                    // Add new keys to existing data
                    Object.keys(payload).forEach(key => {
                        if (!fileData[index].hasOwnProperty(key)) {
                            fileData.forEach(item => {
                                item[key] = null;
                            });
                        }
                    });
    
                    fileData[index] = payload;
                    const newWorkbook = xlsx.utils.book_new();
                    const newWorksheet = xlsx.utils.json_to_sheet(fileData);
                    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet);
                    xlsx.writeFile(newWorkbook, filePath);
                    updated = true;
                    break;
                }
            }
    
            if (!updated) {
                throw new Error("Data not found, update cancelled");
            }
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

    async linearSearch(filenameFiles, searchKey, searchValue) {
        for (let file of filenameFiles) {
            try {
                const workbook = xlsx.readFile(path.join(__dirname, '/db', file));
                const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const foundObject = jsonData.find(obj => obj[searchKey] === searchValue);
                if (foundObject) {
                    return Promise.resolve([foundObject]);
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.error(`File ${file} not found`);
                    return Promise.resolve([]);
                } else {
                    console.error(error);
                    return Promise.reject(error);
                }
            }
        }
        return Promise.resolve([]);
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
    
            if (filenameFiles.length === 0) {
                return [];
            }
    
            if (searchKey !== null && searchValue !== null) {
                return await this.linearSearch(filenameFiles, searchKey, searchValue);
            }
    
            if (page !== -1 && size !== -1) {
                if (!Number.isInteger(page) || !Number.isInteger(size) || page < 1 || size < 1) {
                    throw new Error("Page and size must be integers and 1 or greater, or -1 to return all");
                }
    
                const startFileIndex = (page - 1) * size;
                const endFileIndex = startFileIndex + size;
                let data = [];
    
                for (let i = startFileIndex; i < endFileIndex; i++) {
                    if (i < filenameFiles.length) {
                        const workbook = xlsx.readFile(path.join(__dirname, '/db', filenameFiles[i]));
                        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        data = data.concat(jsonData);
                    }
                }
                return data;
            }
    
            // If no page, size, searchKey, and searchValue are provided, return all data
            let allData = [];
            for (let file of filenameFiles) {
                const workbook = xlsx.readFile(path.join(__dirname, '/db', file));
                const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                allData = allData.concat(jsonData);
            }
            return allData;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            this.lock = false;
        }
    }
}

module.exports = tempDatabase;