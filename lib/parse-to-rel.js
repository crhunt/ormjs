/*
    Convert ORM metamodel to Rel code.
*/

/* Globals */
var metamodel; // Defined in parse-orm
var orm; // Defined in parse-svg

var includedIDs = [];
var highlightNoParse = false;
var graphFormat = true;
var shortFormat = false;

function parse_to_rel() {

    // Add Rel names to ORM metamodel
    metamodel_rel_names();

    // Add Rel readings to ORM metamodel

    // Generate Rel code from readings

}

/* Add rel names */

function metamodel_rel_names() {
    
    /* Add rel names to the ORM metamodel */

    // Add relnames to objects
    for (var objID in metamodel.Object) {
        metamodel.Object[objID]["RelName"] = entity_relname(metamodel.Object[objID].Name);
        // Add atoms
        if (metamodel.Object[objID].type == "EntityType") {
            metamodel.Object[objID]["Atom"] = 
                entity_atom_relname(metamodel.Object[objID].RelName,
                            metamodel.Object[objID].ReferenceMode);
        }
        if (metamodel.Object[objID].type == "ValueType") {
            metamodel.Object[objID]["Atom"] = 
                value_atom_relname(metamodel.Object[objID].Name);
        }
    }


    // Add relnames to facts
    for (var factID in metamodel.Fact) {
        // Add relnames to roles
        for (var roleID in metamodel.Fact[factID].FactRoles) {
            metamodel.Fact[factID].FactRoles[roleID]["RelName"] = 
                role_relname(metamodel.Fact[factID].FactRoles[roleID].Name);
        }
        // Add relnames to reading orders
        for (var roID in metamodel.Fact[factID].ReadingOrders) {
            // Use the role sequence to create a relation name for the reading order
            //     Each reading will use this relation in a different way to generate
            //     integrity constraints.
            metamodel.Fact[factID].ReadingOrders[roID]["RelName"] = 
                reading_order_relname(factID,roID);
        } 
    }
}

function entity_relname(name) {
    /* From the entity or value name, generate a relname. */
    var relname = name.trim().split(" ").filter(e => e).join("")
                      .replaceAll("-","_").replaceAll(":","");
    return relname
}

function entity_atom_relname(name,refmode) {
    /* An atom is the name used to reference a member of the entity type. */
    var relname = name.toLowerCase() + "_" + 
                  refmode.trim().split("_")[0]
                         .replaceAll("-","_").replaceAll(":","");
    return relname
}

function value_atom_relname(name) {
    /* An atom is the name used to reference a member of the value type. */
    var relname = name.trim().split(" ")[0].substring(0,3).toLowerCase()
                      .replaceAll("-","_").replaceAll(":","");
    return relname
}

function role_relname(name) {
    /* Convert individual role name to a relname */
    var relname = name.trim().split(" ").filter(e => e).join("_")
                      .replaceAll("-","_").replaceAll(":","");
    return relname
}

function reading_order_relname(factID,roID) {
    
    /* Convert roleboxes into a relation name */
    
    // Module notation?
    var c;
    graphFormat ? c = ":" : c = "_";
    

    // Get roles
    var boxes = metamodel.Fact[factID].ReadingOrders[roID].RoleSequence;
    
    // Add first role, single box
    var relname = ``;
    if (boxes.length == 1) {
        relname = metamodel.Fact[factID].FactRoles[boxes[0]].RelName;
        var rplayer = entity_relname_from_role(boxes[0],factID);
        if (rplayer) { if (!shortFormat) {relname = `${rplayer}${c}${relname}`;} }
        else { return false }
        return relname
    }

    var inclEntity = true;
    var inclBox = true;
    if (shortFormat && graphFormat) { inclBox = false; }
    else if (shortFormat && !graphFormat) { inclEntity = false; }

    // Add first role
    var rplayer = entity_relname_from_role(boxes[0],factID);
    if (rplayer) { if(inclEntity) { relname = `${rplayer}`; } }
    else { return false }
    if (inclBox) { 
        if (inclEntity) { relname += `${c}`; }
        relname += `${metamodel.Fact[factID].FactRoles[boxes[0]].RelName}`; 
    }
    
    // Add second role
    if ( metamodel.Fact[factID].FactRoles[boxes[1]].RelName.length > 0 ) {
        if (inclBox) { relname += `_${metamodel.Fact[factID].FactRoles[boxes[1]].RelName}`; }
    }
    rplayer = entity_relname_from_role(boxes[1],factID);
    if (rplayer) { if (inclEntity) { relname += `${c}${rplayer}`; } }
    else { return false }
    
    // Add additional roles
    var rng = range(boxes.length-2, startAt=2);
    for ( var n in rng ) {
        if (inclBox) { relname += `${c}${metamodel.Fact[factID].FactRoles[boxes[rng[n]]].RelName}`; }
        rplayer = entity_relname_from_role(boxes[rng[n]],factID);
        if (rplayer) { if (inclEntity) { relname += `${c}${rplayer}`; } }
        else { return false }
    }
    return relname
}

function entity_relname_from_role(roleID, factID) {
    var entityID = metamodel.Fact[factID].FactRoles[roleID].RolePlayer;
    if(!entityID) { return null }
    return metamodel.Object[entityID].RelName
}

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