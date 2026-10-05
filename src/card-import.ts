import {importLines} from './model.js';
export type CardImportFormat='paste'|'txt'|'csv';
export interface ColumnMapping {front:number;back:number|null;header:boolean}
export interface CardImportTable {rows:string[][];columns:number;mapping:ColumnMapping;problems:string[];format:CardImportFormat}
export interface ImportedCard {text:string;back?:string}
export const MAX_IMPORT_BYTES=20*1024*1024;
// Small CSV/TSV reader: quoted delimiters, escaped quotes and multiline fields.
export function delimitedRows(input:string,delimiter:string):string[][] {
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  const source=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const cell=():void=>{row.push(field.trim());field='';closed=false;};
  const line=():void=>{cell();if(row.some(value=>value.length))rows.push(row);row=[];};
  for(let i=0;i<source.length;i++){
    const char=source[i]!;
    if(quoted){if(char==='"'){if(source[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=char;continue;}
    if(char===delimiter){cell();continue;}if(char==='\n'){line();continue;}
    if(closed){if(!/\s/.test(char))throw new Error('Unexpected text after a closing quote. Check the CSV/TSV formatting.');continue;}
    if(char==='"'){if(field.trim())throw new Error('A quote must begin a field. Put quotes around the entire value.');field='';quoted=true;}else field+=char;
  }
  if(quoted)throw new Error('An opening quote has no closing quote. Check the CSV/TSV formatting.');
  line();return rows;
}
const headerKey=(value:string)=>value.trim().toLocaleLowerCase();
const frontHeaders=['front','term','question','prompt','word'];
const backHeaders=['back','definition','answer'];
export function prepareCardImport(input:string,format:CardImportFormat):CardImportTable {
  let rows:string[][]=[],problems:string[]=[];
  try{
    if(new TextEncoder().encode(input).byteLength>MAX_IMPORT_BYTES)throw new Error('Choose text or a file smaller than 20 MB.');
    rows=format==='csv'?delimitedRows(input,','):format==='paste'&&input.includes('\t')?delimitedRows(input,'\t'):importLines(input).map(text=>[text]);
  }catch(error){problems=[error instanceof Error?error.message:String(error)];}
  const columns=rows.reduce((max,row)=>Math.max(max,row.length),1);
  const first=rows[0]?.map(headerKey)??[],front=first.findIndex(value=>frontHeaders.includes(value)),back=first.findIndex(value=>backHeaders.includes(value));
  // Header recognition is CSV-only; plain/TSV pastes retain every line.
  const header=format==='csv'&&front>=0;
  return {rows,columns,format,problems,mapping:{front:header?front:0,back:header?(back>=0?back:null):columns>1?1:null,header}};
}
export function mappedCards(table:CardImportTable,mapping=table.mapping):{items:ImportedCard[];problems:string[]} {
  const problems=[...table.problems],items:ImportedCard[]=[];
  if(problems.length)return {items,problems};
  if(!Number.isInteger(mapping.front)||mapping.front<0||mapping.front>=table.columns||
    (mapping.back!==null&&(!Number.isInteger(mapping.back)||mapping.back<0||mapping.back>=table.columns||mapping.back===mapping.front)))
    return {items,problems:['Choose different, valid columns for Front and Back (or no Back).']};
  table.rows.forEach((row,index)=>{
    if(mapping.header&&index===0)return;
    const text=(row[mapping.front]??'').trim(),back=mapping.back===null?'':(row[mapping.back]??'').trim();
    if(!text){problems.push(`Row ${index+1}: Front is empty. Choose another column or fix/remove this row.`);return;}
    if(table.format==='paste'&&row.length>2)problems.push(`Row ${index+1}: tab-separated paste needs one or two columns. Use a CSV file to map more columns.`);
    items.push({text,...(back?{back}:{})});
  });
  if(!items.length&&!problems.length)problems.push('Add at least one non-empty card.');
  return {items,problems};
}
