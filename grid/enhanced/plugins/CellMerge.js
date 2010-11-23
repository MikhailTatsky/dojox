dojo.provide("dojox.grid.enhanced.plugins.CellMerge");

dojo.require("dojox.grid.enhanced._Plugin");

dojo.declare("dojox.grid.enhanced.plugins.CellMerge",dojox.grid.enhanced._Plugin, {
	// summary:
	//		This plugin provides functions to merge(un-merge) adjacent cells within one row.
	//		Acceptable plugin paramters:
	//		1. mergedCells: Array
	//			An array of objects with structure:
	//			{
	//				row: function(Integer)|Integer
	//					If it's a function, it's a predicate to decide which rows are to be merged. 
	//					It takes an integer (the row index), and should return true or false;
	//				start: Integer
	//					The column index of the left most cell that shall be merged.
	//				end: Integer
	//					The column index of the right most cell that shall be merged.
	//				major: Integer
	//					The column index of the cell whose content should be used as the content of the merged cell.
	//					It must be larger than or equal to the startColumnIndex, and less than or equal to the endColumnIndex.
	//					If it is omitted, the content of the leading edge (left-most for ltr, right most for rtl) cell will be used.
	//			}
	
	// name: String
	//		Plugin name
	name: "cellMerge",
	
	constructor: function(grid, args){
		this.grid = grid;
		this._records = [];
		this._merged = {};
		if(args && dojo.isObject(args)){
			this._setupConfig(args.mergedCells);
		}
		this._initEvents();
		this._mixinGrid();
	},
	//----------------Public----------------------------
	mergeCells: function(rowTester, startColumnIndex, endColumnIndex, majorColumnIndex){
		// summary:
		//		Merge cells from *startColumnIndex* to *endColumnIndex* at rows that make *rowTester* return true,
		//		using the content of the cell at *majorColumnIndex*
		// tags:
		//		public
		// rowTester: function(Integer)|Integer
		//		If it's a function, it's a predicate to decide which rows are to be merged. 
		//		It takes an integer (the row index), and should return true or false;
		// startColumnIndex: Integer
		//		The column index of the left most cell that shall be merged.
		// endColumnIndex: Integer
		//		The column index of the right most cell that shall be merged.
		// majorColumnIndex: Integer?
		//		The column index of the cell whose content should be used as the content of the merged cell.
		//		It must be larger than or equal to the startColumnIndex, and less than or equal to the endColumnIndex.
		//		If it is omitted, the content of the leading edge (left-most for ltr, right most for rtl) cell will be used.
		// return: Object
		//		A handler for the merged cells created by a call of this function. 
		//		This handler can be used later to unmerge cells using the function unmergeCells
		var item = this._createRecord({
			"row": rowTester,
			"start": startColumnIndex,
			"end": endColumnIndex,
			"major": majorColumnIndex
		});
		if(item){
			this._updateRows(item);
		}
		return item;
	},
	unmergeCells: function(mergeHandler){
		// summary:
		//		Unmerge the cells that are merged by the *mergeHandler*, which represents a call to the function mergeCells.
		// tags:
		//		public
		// mergeHandler: object
		//		A handler for the merged cells created by a call of function mergeCells.
		var idx;
		if(mergeHandler && (idx = dojo.indexOf(this._records, mergeHandler)) >= 0){
			this._records.splice(idx, 1);
			this._updateRows(mergeHandler);
		}
	},
	getMergedCells: function(){
		// summary:
		//		Get all records of currently merged cells.
		// tags:
		//		public
		// return: Array
		//		An array of records for merged-cells.
		//		The record has the following structure:
		//		{
		//			"row": 1, //the row index
		//			"start": 2, //the start column index
		//			"end": 4, //the end column index
		//			"major": 3, //the major column index
		//			"handle": someHandle, //The handler that covers this merge cell record. 
		//		} 
		var res = [];
		for(var i in this._merged){
			res = res.concat(this._merged[i]);
		}
		return res;
	},
	getMergedCellsByRow: function(rowIndex){
		// summary:
		//		Get the records of currently merged cells at the given row.
		// tags:
		//		public
		// return: Array
		//		An array of records for merged-cells. See docs of getMergedCells.
		return this._merged[i] || [];
	},
	
	//----------------Private--------------------------
	_setupConfig: function(config){
		dojo.forEach(config, this._createRecord, this);
	},
	_initEvents: function(){
		dojo.forEach(this.grid.views.views, function(view){
			this.connect(view, "onAfterRow", dojo.hitch(this, "_onAfterRow", view.index));
		}, this);
	},
	_mixinGrid: function(){
		var g = this.grid;
		g.mergeCells = dojo.hitch(this, "mergeCells");
		g.unmergeCells = dojo.hitch(this, "unmergeCells");
		g.getMergedCells = dojo.hitch(this, "getMergedCells");
		g.getMergedCellsByRow = dojo.hitch(this, "getMergedCellsByRow");
	},
	_getWidth: function(colIndex){
		var node = this.grid.layout.cells[colIndex].getHeaderNode();
		return dojo.position(node).w;
	},
	_onAfterRow: function(viewIdx, rowIndex, subrows){
		try{
			if(rowIndex < 0){
				return;
			}
			var result = [], i, j, len = this._records.length,
				cells = this.grid.layout.cells;
			//Apply merge-cell requests one by one.
			for(i = 0; i < len; ++i){
				var item = this._records[i];
				if(item.row(rowIndex) && item.view == viewIdx){
					var res = {
						record: item,
						hiddenCells: [],
						totalWidth: 0,
						majorNode: cells[item.major].getNode(rowIndex),
						majorHeaderNode: cells[item.major].getHeaderNode()
					};
					//Calculated the width of merged cell.
					for(j = item.start; j <= item.end; ++j){
						var w = this._getWidth(j, rowIndex);
						res.totalWidth += w;
						if(j != item.major){
							res.hiddenCells.push(cells[j].getNode(rowIndex));
						}
					}
					//If width is valid, remember it. There may be multiple merges within one row.
					if(subrows.length != 1 || res.totalWidth > 0){
						//Remove conflicted merges.
						for(j = result.length - 1; j >= 0; --j){
							var r = result[j].record;
							if((r.start >= item.start && r.start <= item.end) ||
								(r.end >= item.start && r.end <= item.end)){
								result.splice(j, 1);
							}
						}
						result.push(res);
					}
				}
			}
			this._merged[rowIndex] = [];
			dojo.forEach(result, function(res){
				dojo.forEach(res.hiddenCells, function(node){
					dojo.style(node, "display", "none");
				});
				var pbm = dojo.marginBox(res.majorHeaderNode).w - dojo.contentBox(res.majorHeaderNode).w;
				var tw = res.totalWidth;
				
				//Tricky for WebKit.
				if(!dojo.isWebKit){
					tw -= pbm;
				}
				
				dojo.style(res.majorNode, "width", tw + "px");
				//In case we're dealing with multiple subrows.
				dojo.attr(res.majorNode, "colspan", res.hiddenCells.length + 1);
	
				this._merged[rowIndex].push({
					"row": rowIndex,
					"start": res.record.start,
					"end": res.record.end,
					"major": res.record.major,
					"handle": res.record
				});
			}, this);
		}catch(e){
			console.log("_onAfterRow: ", rowIndex, e);
		}
	},
	_createRecord: function(item){
		if(this._isValid(item)){
			item = {
				"row": item.row,
				"start": item.start,
				"end": item.end,
				"major": item.major
			};
			var cells = this.grid.layout.cells;
			item.view = cells[item.start].view.index;
			item.major = typeof item.major == "number" && !isNaN(item.major) ? item.major : item.start;
			if(typeof item.row == "number"){
				var r = item.row;
				item.row = function(rowIndex){ 
					return rowIndex === r; 
				};
			}
			if(dojo.isFunction(item.row)){
				this._records.push(item);
				return item;
			}
		}
		return null;
	},
	_isValid: function(item){
		var cells = this.grid.layout.cells,
			colCount = cells.length;
		return (dojo.isObject(item) && ("row" in item) && ("start" in item) && ("end" in item) && 
			item.start >= 0 && item.start < colCount &&
			item.end > item.start && item.end < colCount &&
			cells[item.start].view.index == cells[item.end].view.index &&
			cells[item.start].subrow == cells[item.end].subrow &&
			!(typeof item.major == "number" && (item.major < item.start || item.major > item.end)));
	},
	_updateRows: function(item){
		for(var i = 0, count = this.grid.rowCount; i < count; ++i){
			if(item.row(i) && this.grid._by_idx[i]){
				this.grid.views.updateRow(i);
			}
		}
	}
});
dojox.grid.EnhancedGrid.registerPlugin('cellMerge', dojox.grid.enhanced.plugins.CellMerge);