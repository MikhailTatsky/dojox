dojo.provide("dojox.grid.enhanced.plugins.exporter.CSVWriter");

dojo.require("dojox.grid.enhanced.plugins.exporter._ExportWriter");

dojox.grid.enhanced.plugins.Exporter.registerWriter("csv",
	"dojox.grid.enhanced.plugins.exporter.CSVWriter");

dojo.declare("dojox.grid.enhanced.plugins.exporter.CSVWriter",
	dojox.grid.enhanced.plugins.exporter._ExportWriter, {
	// summary:
	//		Export grid to CSV format.
	_separator: ',',
	constructor: function(/* object? */writerArgs){
		// summary:
		//		CSV default separator is ','.
		//		But we can also use our own.
		// writerArgs: object?
		//		{separator:'...'}
		if(writerArgs && writerArgs.separator){
			this._separator = writerArgs.separator;	
		}
		this._headers = [];
		this._dataRows = [];
	},
	_formatCSVCell: function(/* string */cellValue){
		// summary:
		//		Format cell value to follow CSV standard.
		//		See: http://en.wikipedia.org/wiki/Comma-separated_values
		// tags:
		//		private
		// cellValue: string
		//		The value in a cell.
		// returns:
		//		The formatted content of a cell
		if(!cellValue){
			return '';
		}
		var result = String(cellValue).replace(/"/g, '""');
		if(result.indexOf(this._separator) >= 0 || result.search(/[" \t\n]/) >= 0){
			result = '"' + result + '"';
		}
		return result;	//String
	},
	beforeContentRow: function(/* object */arg_obj){
		// summary:
		//		Overrided from _ExportWriter
		var row = [],
			func = this._formatCSVCell;
		dojo.forEach(arg_obj.grid.layout.cells, function(cell){
			//We are not interested in indirect selectors and row indexes.
			if(!cell.hidden && dojo.indexOf(arg_obj.spCols,cell.index) < 0){
				//We only need data here, not html
				row.push(func(this._getExportDataForCell(arg_obj.rowIndex, arg_obj.row, cell, arg_obj.grid)));	
			}
		}, this);
		this._dataRows.push(row);
		//We do not need to go into the row.
		return false;	//Boolean
	},
	handleCell: function(/* object */arg_obj){
		// summary:
		//		Overrided from _ExportWriter
		var cell = arg_obj.cell;
		if(arg_obj.isHeader && !cell.hidden && dojo.indexOf(arg_obj.spCols,cell.index) < 0){
			this._headers.push(cell.name || cell.field);
		}
	},
	toString: function(){
		// summary:
		//		Overrided from _ExportWriter
		var result = this._headers.join(this._separator),
			endl = '\n';
		for(var i = this._dataRows.length - 1; i >= 0; --i){
			this._dataRows[i] = this._dataRows[i].join(this._separator);
		}
		return result + endl + this._dataRows.join(endl);	//String
	}
});