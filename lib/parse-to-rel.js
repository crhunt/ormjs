/*
    Convert ORM metamodel to Rel code.
*/

var includedIDs = [];
var highlightNoParse = false;

/* Highlight unparsed objects */

function highlight_notparsed() {
    var class_string;
    // Find all entities that are not parsed
    for ( var entityID in orm.entities ) {
        add_notparsed_class(entityID);
    }
    // Find all connectors that are not parsed
    for ( var connID in orm.connectors ) {
        add_notparsed_class(connID);
    }
    // Find roleboxes that are not parsed
    for ( var boxID in orm.roleboxes ) {
        add_notparsed_class(boxID);
    }
    // Find values that are not parsed
    for ( var valueID in orm.values ) {
        add_notparsed_class(valueID);
    }
}

function add_notparsed_class(anyID) {
    unclass_notparsed(anyID);
    if ( ! includedIDs.includes(anyID) && highlightNoParse ) {
        class_notparsed(anyID);
    }
}

function unclass_notparsed(anyID) {
    var class_string = d3.select("#"+anyID).attr("class");
    d3.select("#"+anyID).attr( "class", class_string.replace(" notparsed", "") );
}

function class_notparsed(anyID) {
    var class_string = d3.select("#"+anyID).attr("class");
    d3.select("#"+anyID).attr("class", class_string + " notparsed");
}

function set_highlighter() {
    if(d3.select("#highlightNoParse").property("checked")){
        highlightNoParse = true;
    } else {
        highlightNoParse = false;
    }
    highlight_notparsed();
}