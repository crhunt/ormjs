/* 
    Convert d3 data to ORM metamodel.

    Note the design here is to make a full pass over the model whenever 
    parse_orm() is triggered. So no incremental updates. However, the
    individual update functions are designed to make it easier to add
    functions for incremental updates in the future.

    We may want to move to a system where each d3 object is linked to
    its representation in the metamodel. And that component of the metamodel 
    is updated when the d3 object is changed. 
        This will be especially useful for large models. Since ORMJS is 
        currently aimed at prototyping and as a teaching tool, we defer 
        this for now.

 */

/* Globals */
var orm; // Defined in parse-svg
var metamodel; // Defined here
var ormjs2mm; // Defined here

var graphFormat = false; // Defined here
var shortFormat = true; // Defined here

/* Main functions */

function parse_orm() {

    initialize_metamodel();

    // Add all objects
    metamodel_add_objects();

    // Add all facts
    metamodel_add_facts();

    // Add all constraints

    // Generate XML
    metamodel_add_xml();

    // Convert to Rel
    parse_to_rel();

    // Add shadows
    add_shadows();

    console.log(metamodel);
}

function initialize_metamodel() {
    metamodel = { Object: {}, Fact: {}, SubtypeFact: {}, Constraint: {}, relIDs: [], XML: "" };
    ormjs2mm = {};
}

function metamodel_add_objects() {
    
    // Add entities
    metamodel_add_entities();

    // Add values
    metamodel_add_values();

}

function metamodel_add_facts() {

    // Add facts (based on rolebox groups)
    var n = 0;
    for( var rbgID in orm.rbgroups ) {
        var f = new Fact(n,orm.rbgroups[rbgID]);
        // Add to ormjs2mm
        ormjs2mm[rbgID] = f.id;
        for (var m in f.FactRoles) { ormjs2mm[f.FactRoles[m]._rboxID] = f.FactRoles[m].id }
        // Add to metamodel
        metamodel.Fact[f.id] = f;
        f.populate_shadows();
        f.populate_reading_orders();
        n += 1;
    }

    // Update object played roles
    for ( var objID in metamodel.Object ) {
        metamodel.Object[objID].PlayedRoles = 
            metamodel.Object[objID].PlayedRoles.map( e => ormjs2mm[e] );
    }

    // Add subtype facts

}

function metamodel_add_xml() {

    // Add full model
    var t = "    ";
    metamodel.XML = `<orm:ORMModel>\n`;

    // Add objects
    metamodel.XML += `${t}<orm:Objects>\n`;
    for ( var objID in metamodel.Object ) { 
        metamodel.Object[objID].toXML(); // Add XML to object
        var xml = (' ' + metamodel.Object[objID].XML).slice(1); // Deep copy
        xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
        metamodel.XML += `${t}${t}${xml}\n`; // Add to model
    }
    metamodel.XML += `${t}</orm:Objects>\n`;
    
    // Add facts
    metamodel.XML += `${t}<orm:Facts>\n`;
    for (var factID in metamodel.Fact ) {
        metamodel.Fact[factID].toXML(); // Add XML to Fact
        var xml = (' ' + metamodel.Fact[factID].XML).slice(1); // Deep copy
        xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
        metamodel.XML += `${t}${t}${xml}\n`; // Add to model
    }
    metamodel.XML += `${t}</orm:Facts>\n`;

    metamodel.XML += `</orm:ORMModel>\n`;

}

/* Add objects to metamodel */

function metamodel_add_entities() {

    /* Add entities to the metamodel, being careful to recognize duplicates. */

    var n = 0;
    for (var objID in orm.entities ) {
        matchID = metamodel_match_object( orm.entities[objID] );
        if (!matchID) {
            var en = new EntityType(n, orm.entities[objID]);
            n += 1;
            ormjs2mm[objID] = en.id;
            metamodel.Object[en.id] = en;
        } else {
            // Match found
            ormjs2mm[objID] = matchID;
            metamodel.Object[matchID].extend( orm.entities[objID] );
        }
    }
}

function metamodel_add_values() {

    var n = 0;
    for (var objID in orm.values ) {
        matchID = metamodel_match_object( orm.values[objID] );
        if (!matchID) {
            var val = new ValueType(n, orm.values[objID]);
            n += 1;
            ormjs2mm[objID] = val.id;
            metamodel.Object[val.id] = val;
        } else {
            // Match found
            ormjs2mm[objID] = matchID;
            metamodel.Object[matchID].extend( orm.values[objID] );
        }
    }
    // Need to add refmode from entities
}

function metamodel_match_object(object) {

    /* Two entities are the same if they have the same name, 
       regardless of reference mode! */
    
    var d = object.datum();
    var kindmatch = { "entity": "EntityType", "value": "ValueType" };
    
    for ( var mmID in metamodel.Object ) {
        if ( metamodel.Object[mmID].Name == d.name &&
             metamodel.Object[mmID].type == kindmatch[d.kind]) {
            return mmID
        }
    }
    return false
}

/* Add facts to metamodel */

function metamodel_match_fact(fact) {

    /* The parameters that have to match depend on whether we are using shortFormat
       and/or graphFormat. The facts "match" if they have the same *fact name*, even if the
       details are different. (Different IUCs, etc.) 
       
       Unlike Objects, "matching" Facts are each added to the metamodel, and _Shadows 
       reference other ormjs rolebox groups with the same fact name. */

    // Get the factroles format for the fact we are checking
    var rbg_factroles = fact.FactRoles;

    // Determine which values need to match for shadowing
    //    Note: Shadows have the same fact name but may have other differing information,
    //          like entities they connect to, constraints, etc.
    var factlist = [];
    var matchlist = ["Multiplicity", "RolePlayer", "Name"];
    if (shortFormat && graphFormat) { matchlist = ["Multiplicity", "RolePlayer"]; }
    else if (!shortFormat && !graphFormat) { matchlist = ["Multiplicity", "RolePlayer"]; }
    else if (shortFormat && !graphFormat) { matchlist = ["Multiplicity", "Name"]; }
    if (rbg_factroles.length == 1) { matchlist.push("Name"); }

    // JS almost certainly has a less loopy way to write the below...
    // Check whether each role in the fact has the same values for all the properties in
    // matchlist as some fact already in the metamodel.
    for (var factID in metamodel.Fact) {
        var factroles = metamodel.Fact[factID].FactRoles;
        var match = true;
        if ( Object.keys(factroles).length == Object.keys(rbg_factroles).length) {
            for (var n in factroles) {
                for (var m in matchlist) {
                    if (factroles[n][matchlist[m]] != rbg_factroles[n][matchlist[m]]) {
                        match = false;
                    }
                }
            }
        } else if ( metamodel.Fact[factID]._Name == fact._Name &&
                    matchlist.includes("Name") ) {
            // Binary and Unary facts have the same name
            // This works because we set fact._Name to be the rbgroup name!
            // ( This is different from .ORM convention! )
            match = true;
        } else { match = false; }
        
        if (match && factID != fact.id) { factlist.push( factID ); }
    }

    return factlist
}

/* Settings that determine how to determine if facts are shadowed */

/* Set whether to use Graph Rel format. This determines:
   1. whether to use modules for the fact relation name
   2. the behavior of Short Rel format (see below) */

function set_graphformat() {
    d3.select("#graphFormat").property("checked") ? graphFormat = true : graphFormat = false;
    parse_orm();
}

/* Set whether to use Short Rel format. This determines:
   1. whether to include relations as a part of the fact name 
      (if true, no relations in graph mode)
   2. whether to use entities for the fact name 
      (if true, no entities in non-graph mode) */

function set_shortformat() {
    d3.select("#shortFormat").property("checked") ? shortFormat = true : shortFormat = false;
    parse_orm();
}
