/*
    Convert ORM metamodel to Rel code.
*/

/* Globals */
var metamodel; // Defined in parse-orm
var orm; // Defined in parse-svg

var includedIDs = [];
var highlightNoParse = false; // Defined here

function parse_to_rel() {

    // Add Rel names to ORM metamodel
    metamodel_rel_names();

    // Add Rel readings to ORM metamodel
    add_rel_readings();

    // Generate Rel code from readings
    fill_readings();

    // Display Rel code
    display_rel();

}

/* Add rel names */

function metamodel_rel_names() {
    
    /* Add rel names to the ORM metamodel */

    // Add relnames to objects
    for (var objID in metamodel.Object) {
        metamodel.Object[objID]["_RelName"] = entity_relname(metamodel.Object[objID].Name);
        // Add atoms
        if (metamodel.Object[objID].type == "EntityType") {
            metamodel.Object[objID]["_Atom"] = 
                entity_atom_relname(metamodel.Object[objID]._RelName,
                            metamodel.Object[objID].ReferenceMode);
        }
        if (metamodel.Object[objID].type == "ValueType") {
            metamodel.Object[objID]["_Atom"] = 
                value_atom_relname(metamodel.Object[objID].Name);
        }
    }

    // Add relnames to facts
    for (var factID in metamodel.Fact) {
        // Add relnames to roles
        for (var roleID in metamodel.Fact[factID].FactRoles) {
            metamodel.Fact[factID].FactRoles[roleID]["_RelName"] = 
                role_relname(metamodel.Fact[factID].FactRoles[roleID].Name);
        }
        // Add relnames to reading orders
        for (var roID in metamodel.Fact[factID].ReadingOrder) {
            // Use the role sequence to create a relation name for the reading order
            //     Each reading will use this relation in a different way to generate
            //     integrity constraints.
            metamodel.Fact[factID].ReadingOrder[roID]["_RelName"] = 
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
    
    /* Convert roleboxes into a relation name. 
    
       This looks more complicated than it is because we allow different naming
       conventions for relnames. The 4 conventions are:
       1. (shortFormat = T, graphFormat = F) Use rolebox names as relation names
       2. (shortFormat = T, graphFormat = T) Use entity names as relation names, with modules
       3. (shortFormat = F, graphFormat = T) Use entity names and rolebox names as relation 
          names, with modules
       4. (shortFormat = F, graphFormat = F) Use entity names and rolebox names as relation 
          names, with underscores connecting the names (...Don't do this one. Ew.)
    */
    
    // Module notation?
    var c;
    graphFormat ? c = ":" : c = "_";
    

    // Get roles
    var boxes = metamodel.Fact[factID].ReadingOrder[roID].RoleSequence;
    
    // Add first role, single box
    // Rules here are a little different to conform to shadowing rules.
    // (The shortFormat + graphFormat case is different--we use Entity:role notation rather
    //  than just Entity, since the latter wouldn't make sense!)
    if (boxes.length == 1) {
        var rplayer = entity_relname_from_role(boxes[0],factID);
        var role = metamodel.Fact[factID].FactRoles[boxes[0]]._RelName;
        if (rplayer) {
            if (graphFormat || !shortFormat) { return `${rplayer}${c}${role}` }
            else { return role }
        } else { return false }
    }

    // Convert format choices into whether to include rolebox names and entity names
    // in fact relation name.
    var inclEntity = true;
    var inclBox = true;
    if (shortFormat && graphFormat) { inclBox = false; }
    else if (shortFormat && !graphFormat) { inclEntity = false; }

    // Add first role
    var relname = ``;
    var rplayer = entity_relname_from_role(boxes[0],factID);
    if (rplayer) { if(inclEntity) { relname = `${rplayer}`; } }
    else { return false } // Always return false if no role player for any role
    if (inclBox) { 
        if (inclEntity) { relname += `${c}`; }
        relname += `${metamodel.Fact[factID].FactRoles[boxes[0]]._RelName}`; 
    }
    
    // Add second role
    if ( metamodel.Fact[factID].FactRoles[boxes[1]]._RelName.length > 0 ) {
        if (inclBox) { relname += `_${metamodel.Fact[factID].FactRoles[boxes[1]]._RelName}`; }
    }
    rplayer = entity_relname_from_role(boxes[1],factID);
    if (rplayer) { if (inclEntity) { relname += `${c}${rplayer}`; } }
    else { return false } // Always return false if no role player for any role
    
    // Add additional roles
    var rng = range(boxes.length-2, startAt=2);
    for ( var n in rng ) {
        if (inclBox) { relname += `${c}${metamodel.Fact[factID].FactRoles[boxes[rng[n]]]._RelName}`; }
        rplayer = entity_relname_from_role(boxes[rng[n]],factID);
        if (rplayer) { if (inclEntity) { relname += `${c}${rplayer}`; } }
        else { return false } // Always return false if no role player for any role
    }
    return relname
}

function entity_relname_from_role(roleID, factID) {
    var entityID = metamodel.Fact[factID].FactRoles[roleID].RolePlayer;
    if(!entityID) { return null }
    return metamodel.Object[entityID]._RelName
}

/* Add Rel code readings */

function add_rel_readings() {

    for (var factID in metamodel.Fact) {
        for (var ronum in metamodel.Fact[factID].ReadingOrder) {
        for (var rnum in metamodel.Fact[factID].ReadingOrder[ronum].Reading) {
            metamodel.Fact[factID].ReadingOrder[ronum].Reading[rnum]._RelData = []; // Default
            // Forward Reading
            if ( metamodel.Fact[factID].ReadingOrder[ronum].Reading[rnum]._ReadingType == "NaryForwardReading" ) {
                metamodel.Fact[factID].ReadingOrder[ronum].Reading[rnum]._RelData =
                    add_NaryForwardReading(factID,ronum)
            }
            // Mandatory Reading
            // Internal UC Reading

            // Populate readings
        }
        }
    }
}

function add_NaryForwardReading(factID, ronum) {

    /* Convert an ORM reading of an n-ary rolebox fact into Rel code */

    // Get fact relation name
    var relname = metamodel.Fact[factID].ReadingOrder[ronum]._RelName;
    if (!relname) { return [] }

    // Create subset relation with all members of each entity, 
    // ordered by the arity of relname.
    var roleseq = metamodel.Fact[factID].ReadingOrder[ronum].RoleSequence;
    var rolestring = roleseq.map( e => `{${e}}` ).join(", ");

    // If relname is shadowed, we need to extend subset relation.
    var relcode = [];
    if( metamodel.Fact[factID]._Shadows.length > 1 ) {
        /* Relation is shadowed. Therefore we need an extendable relation
           definition to handle the space of allowed entity and value types
           in the relation. We define subset_relation as an inline relation
           that covers this space. */
        //var subset_relation = `allowed_${relname.replaceAll(":","_")}`;
        var subset_relation = `allowed_${relname}`;
        relcode.push(`ic { ${relname} ⊆ ${ subset_relation } }`);
        relcode.push(`@inline def ${subset_relation} = (${ rolestring })`);
    } else {
        relcode.push(`ic { ${relname} ⊆ (${ rolestring }) }`);
    }

    return relcode
}

function fill_readings() {
    for (var factID in metamodel.Fact) {
        fill_reading(metamodel.Fact[factID]);
    }
}

function fill_reading(fact) {

    /* Add entities to reading. */

    // Map role to entity for all roles in fact
    var role_map = { "data": {}, "rel": {} };
    for (var n in fact.FactRoles) {
        var key = `{${n}}`;
        var objID = fact.FactRoles[n].RolePlayer;
        if (objID != null) { 
            role_map["data"][key] = metamodel.Object[objID].Name; 
            role_map["rel"][key] = metamodel.Object[objID]._RelName; 
        }
    }

    for (var ro in fact.ReadingOrder) {
    for (var r in fact.ReadingOrder[ro].Reading) {
        var data = fact.ReadingOrder[ro].Reading[r].Data;
        var reldata = [...fact.ReadingOrder[ro].Reading[r]._RelData];
        for (var key in role_map["data"]) {
            data = data.replaceAll(key, role_map["data"][key]);
            reldata = reldata.map( e => e.replaceAll(key, role_map["rel"][key]) );
        }
        if ( data.includes("{") ) {
            data = null;
            reldata = [];
        }
        fact.ReadingOrder[ro].Reading[r]._Statement = data;
        fact.ReadingOrder[ro].Reading[r]._RelStatement = reldata;
    }
    }
}

/* Display Rel code */

function display_rel() {
    
    // Rel code block
    var relcode = "";

    // Group facts by primary entity
    fact_groups = facts_by_entity();
    for ( var objID in fact_groups ) {
        var statements = [];
        // Get all statements
        for (var fn in fact_groups[objID]["facts"]) {
            var loc = fact_groups[objID]["facts"][fn];
            var readings = metamodel.Fact[loc[0]].ReadingOrder[loc[1]].Reading;
            for (var r in readings) {
                if (readings[r]._Statement != null) {
                    statements.push( `// ${readings[r]._Statement}` );
                    statements.push.apply( statements, readings[r]._RelStatement );
                }
            }
        }
        // If duplicates, keep first
        fact_groups[objID]["statements"] = statements.filter(function(item, pos) {
            return statements.indexOf(item) == pos;
        })
        // Add to Rel code
        if( fact_groups[objID]["statements"].length > 0 ) {
            relcode += `/* ${metamodel.Object[objID].Name} */ \n\n`;
            relcode += fact_groups[objID]["statements"].join("\n");
            relcode += "\n\n";
        }
    }
    
    // Display
    d3.select("#rel").html(`<pre><code class="language-js">${relcode}</code></pre>`);

}

function facts_by_entity() {
    
    /* Group facts by primary entity */

    fact_groups = {};
    for ( var factID in metamodel.Fact ) {
        for ( var roID in metamodel.Fact[factID].ReadingOrder ) {
            var objID = metamodel.Fact[factID].ReadingOrder[roID]._FirstEntity;
            if (objID != null ) {
                if ( !(objID in fact_groups) ) { 
                    fact_groups[objID] = {"facts": [] }; 
                }
                fact_groups[objID]["facts"].push([factID, roID]);
            }
        }
    }
    return fact_groups
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
    d3.select("#"+anyID).attr( "class", class_string.replaceAll(" notparsed", "") );
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
