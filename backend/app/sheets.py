"""Read SAP ID and Band (Mhz) columns from an uploaded Excel / CSV file."""
importcsv
frompathlibimportPath


classSheetError(ValueError):
    pass


def_clean(v)->str:
    ifvisNone:
        return""
ifisinstance(v,float)andv.is_integer():
        returnstr(int(v))
returnstr(v).strip()


def_rows(path:Path,ext:str):
    ifext==".csv":
        withopen(path,newline="",encoding="utf-8-sig",errors="replace")asfh:
            yieldfromcsv.reader(fh)
elifext==".xlsx":
        fromopenpyxlimportload_workbook

wb=load_workbook(path,read_only=True,data_only=True)
try:
            yieldfromwb.active.iter_rows(values_only=True)
finally:
            wb.close()
elifext==".xls":
        importxlrd

sh=xlrd.open_workbook(path).sheet_by_index(0)
foriinrange(sh.nrows):
            yieldsh.row_values(i)
else:
        raiseSheetError("Only Excel (.xls, .xlsx) and CSV files are allowed")


defparse_sheet(path:Path,ext:str)->tuple[list[str],list[str]]:
    it=iter(_rows(path,ext))
try:
        header=[_clean(h).lower()forhinnext(it)]
exceptStopIteration:
        raiseSheetError("File is empty")
sap=next((ifori,hinenumerate(header)if"sap"inh),None)
band=next((ifori,hinenumerate(header)if"band"inh),None)
ifsapisNoneorbandisNone:
        raiseSheetError('File needs "SAP ID" and "Band (Mhz)" columns')
saps,bands={},{}
forrowinit:
        iflen(row)>max(sap,band):
            s,b=_clean(row[sap]),_clean(row[band])
ifs:
                saps[s]=None
ifb:
                bands[b]=None
ifnotsapsornotbands:
        raiseSheetError("No SAP ID / Band values found in the file")

defnum(x:str):
        try:
            return(0,float(x))
exceptValueError:
            return(1,x)

returnlist(saps),sorted(bands,key=num)
