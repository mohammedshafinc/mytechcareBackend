export const D1_MAX_BOUND_PARAMETERS=100;
export function chunkRows<T>(rows:T[],fixed:number,perRow:number){const size=Math.floor((D1_MAX_BOUND_PARAMETERS-fixed)/perRow);if(size<1)throw new Error('invalid_bulk_shape');const chunks:T[][]=[];for(let i=0;i<rows.length;i+=size)chunks.push(rows.slice(i,i+size));if(chunks.length+3>50)throw new Error('statement_limit');return chunks;}
