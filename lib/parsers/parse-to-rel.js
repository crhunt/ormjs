/*
    Convert ORM metamodel to Rel code.
*/

/* Globals */
var metamodel; // Defined in parse-orm
var orm; // Defined in parse-svg

var highlightNoParse = false; // Defined here
var parse_xml;

function parse_to_rel() {

    // Add Rel names to ORM metamodel
    metamodel_rel_names();

    // Add Rel readings to ORM metamodel
    add_rel_readings();;

    // Add highlight
    highlight_notparsed();

}

/* Add rel names */

function metamodel_rel_names() {
    
    /* Add rel names to the ORM metamodel */

    // Add relnames to objects
    for (var objID in metamodel.Object) {
        metamodel.Object[objID].set_relname();
    }

    // Add relnames to facts
    for (var factID in metamodel.Fact) {
        // Add relnames to roles
        metamodel.Fact[factID].FactRoles.map( (role) => { role.set_relname(); } );
        /* Use the role sequence to create a relation name for the reading order
               Each reading will use this relation in a different way to generate
               integrity constraints.*/
        metamodel.Fact[factID].ReadingOrder.map( (ro) => { ro.set_relname(); } );
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

function reading_order_relname(ro) {
    
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
    var factID = ro._factID;
    var boxes = ro.RoleSequence;
    var factroles = metamodel.Fact[factID].FactRoles;
    
    // Add first role, single box
    // Rules here are a little different to conform to shadowing rules.
    // (The shortFormat + graphFormat case is different--we use Entity:role notation rather
    //  than just Entity, since the latter wouldn't make sense!)
    if (boxes.length == 1) {
        if (factroles[boxes[0]].RolePlayer == null) { return false }
        var rplayer = metamodel.Object[ factroles[boxes[0]].RolePlayer ]._RelName;
        var role = metamodel.Fact[factID].FactRoles[boxes[0]]._RelName;
        if (graphFormat || !shortFormat) { return `${rplayer}${c}${role}` }
        else { return role }
    }

    // Convert format choices into whether to include rolebox names and entity names
    // in fact relation name.
    var inclEntity = true;
    var inclBox = true;
    if (shortFormat && graphFormat) { inclBox = false; }
    else if (shortFormat && !graphFormat) { inclEntity = false; }

    // Add first role
    var relname = ``;
    if (factroles[boxes[0]].RolePlayer == null) { return false }
    var rplayer = metamodel.Object[ factroles[boxes[0]].RolePlayer ]._RelName;
    if(inclEntity) { relname = `${rplayer}`; }
    if (inclBox) { 
        if (inclEntity) { relname += `${c}`; }
        relname += `${metamodel.Fact[factID].FactRoles[boxes[0]]._RelName}`; 
    }
    
    // Add second role
    if ( metamodel.Fact[factID].FactRoles[boxes[1]]._RelName.length > 0 ) {
        if (inclBox) { relname += `_${metamodel.Fact[factID].FactRoles[boxes[1]]._RelName}`; }
    }
    if (factroles[boxes[1]].RolePlayer == null) { return false }
    rplayer = metamodel.Object[ factroles[boxes[1]].RolePlayer ]._RelName;
    if (inclEntity) { relname += `${c}${rplayer}`; }
    
    // Add additional roles
    var rng = GraphUtils.range(boxes.length-2, startAt=2);
    for ( var n in rng ) {
        if (inclBox) { relname += `${c}${metamodel.Fact[factID].FactRoles[boxes[rng[n]]]._RelName}`; }
        //rplayer = entity_relname_from_role(factroles[boxes[rng[n]]]);
        if (factroles[boxes[ rng[n] ]].RolePlayer == null) { return false }
        rplayer = metamodel.Object[ factroles[boxes[ rng[n] ]].RolePlayer ]._RelName;
        if (inclEntity) { relname += `${c}${rplayer}`; }
    }
    return relname
}

/* Add Rel code readings */

function add_rel_readings() {

    for (var factID in metamodel.Fact) {
        metamodel.Fact[factID].ReadingOrder.map( (ro) => {
            ro.Reading.map( (reading) => { reading.set_rel_reading(); } );
        } );
        metamodel.Fact[factID].fill_readings();
    }
}

function add_NaryForwardReading(reading) {

    /* Convert an ORM reading of an n-ary rolebox fact into Rel code */

    // Get fact relation name
    var factID = reading._factID;
    var ronum = reading._ronum;
    var relname = metamodel.Fact[factID].ReadingOrder[ronum]._RelName;
    if (!relname) { return }
    var id;
    graphFormat ? id = ":id" : id = "";

    // Create subset relation with all members of each entity, 
    // ordered by the arity of relname.
    var roleseq = metamodel.Fact[factID].ReadingOrder[ronum].RoleSequence;
    var rolestring = roleseq.map( e => `{${e}}${id}` ).join(", ");

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

    reading._RelData = relcode;
}

function add_MandatoryForwardReading(reading) {

    // Get mandatory role
    var rolen = reading.ExpandedData[0].RoleIndex;
    // Get fact relation name
    var relname = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum]._RelName;
    if (!relname) { return }
    var id;
    graphFormat ? id = ":id" : id = "";

    // Get total number of roles
    var total_roles = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum]
                               .RoleSequence.length;

    var relstring = "";
    if (total_roles == 2) {
        // Binary
        rolen == 0 ? relstring = `ic { total({${rolen}}${id}, ${relname}) }` 
                   : relstring = `ic { total({${rolen}}${id}, transpose[${relname}]) }`;
    } else {
        // Nary
        var atom = `{a${rolen}}`; // Get atom of role player
        var position = "_,".repeat(rolen) + atom + ",_".repeat(total_roles - rolen - 1);
        var relstring = `ic { {${rolen}}${id}(${atom}) implies ${relname}(${position}) }`;
    }

    reading._RelData = [relstring];

}

function _fill_readings(fact) {

    /* Add entities to reading. */

    // Map role to entity for all roles in fact
    var role_map = { "data": {}, "rel": {}, "atom": {}, "atom_key": {} };
    var objlist = [];
    for (var n in fact.FactRoles) {
        var key = `{${n}}`;
        var akey = `{a${n}}`;
        var objID = fact.FactRoles[n].RolePlayer;
        if (objID != null) { 
            role_map["data"][key] = metamodel.Object[objID].Name; 
            role_map["rel"][key] = metamodel.Object[objID]._RelName; 
            role_map["atom"][key] = metamodel.Object[objID]._Atom; 
            role_map["atom_key"][key] = akey;
            objlist.push.apply(objlist, metamodel.Object[objID]._Shadows);
        }
    }
    // TO DO: make sure atoms don't have duplicates

    fact.ReadingOrder.map( (ro) => {
        ro.Reading.map( (reading) => {
            var data = reading.Data;
            var reldata = [...reading._RelData];
            for (var key in role_map["data"]) {
                data = data.replaceAll(key, role_map["data"][key]);
                reldata = reldata.map( e => e.replaceAll(key, role_map["rel"][key]) );
                reldata = reldata.map( e => e.replaceAll(role_map["atom_key"][key], 
                                                         role_map["atom"][key]) );
            }
            if ( data.includes("{") ) {
                data = null;
                reldata = [];
            } else {
                metamodel.relIDs.push.apply(metamodel.relIDs, reading._includedIDs);
                metamodel.relIDs.push.apply(metamodel.relIDs, objlist);
            }
            reading._Statement = data;
            reading._RelStatement = reldata;
        } );
    } );
}

/* Display Rel code */

function display_rel() {

    if (parse_xml) { return }
    
    // Rel code block
    var relcode = "";

    // Group facts by primary entity
    fact_groups = facts_by_entity();
    for ( var objID in fact_groups ) {
        // Add statements for entity objID
        var statements = [];
        fact_groups[objID]["facts"].map( (ro) => {
            ro.Reading.map( (reading) => {
                if (reading._Statement != null) {
                    statements.push( `// ${reading._Statement}` );
                    statements.push.apply( statements, reading._RelStatement );
                }
            } );
        } );
        // Filter statement in case of duplicates, keep first
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
        metamodel.Fact[factID].ReadingOrder.map( (ro) => {
            var objID = ro._FirstEntity;
            if ( objID != null ) {
                objID in fact_groups ? fact_groups[objID]["facts"].push(ro)
                                     : fact_groups[objID] = { "facts": [ro] };
            }
        } );
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
    // Find internal UCs that are not parsed
    for ( var boxID in orm.roleboxes ) {
        add_notparsed_class("c-"+boxID);
    }
    // Find values that are not parsed
    for ( var valueID in orm.values ) {
        add_notparsed_class(valueID);
    }
    // Find constraints that are not parsed
    for ( var constID in orm.constraints ) {
        add_notparsed_class(constID);
    }
}

function add_notparsed_class(anyID) {
    Graph.unclass_as(anyID, "notparsed");
    if ( ! metamodel.relIDs.includes(anyID) && highlightNoParse ) {
        Graph.class_as(anyID, "notparsed");
    }
}

function set_highlighter() {
    if(d3.select("#highlightNoParse").property("checked")){
        highlightNoParse = true;
    } else {
        highlightNoParse = false;
    }
    highlight_notparsed();
}
