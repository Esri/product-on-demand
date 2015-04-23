define([
    "dojo/_base/declare",
    "esri/dijit/Search"
], 
function(declare, Search) {
    return declare("CustomSearch", [Search], {
    	_supportsPagination: function (source) {	
    		for (var i = 0; i < this.sources.length; i++) {
    			//Fix "Pagination is not supported"
            	this.sources[i].maxSuggestions = "somestring";
            }     		
    		return true;
    	},

        _insertSuggestions: function (suggestions) {
            for (var i = 0; i < this.sources.length; i++) {                
            	this.sources[i].maxSuggestions = this.maxSuggestions;       
            }
            this.inherited(arguments);
        }        

    });
	
});