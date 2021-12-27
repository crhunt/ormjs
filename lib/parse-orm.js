/* 
    Convert d3 data to ORM metamodel.

    Note the design here is to make a full pass over the model whenever 
    parse_orm() is triggered. So no incremental updates. However, the
    individual update functions are designed to make it easier to add
    functions for incremental updates in the future.
 */

/* Globals */
var orm; // Defined in parse-svg
var conntypes;
var metamodel; // Defined here
var ormjs2mm; // Defined here
var mult_param; // Defined in rolebox-constructor

var graphFormat = false; // Defined here
var shortFormat = true; // Defined here

function parse_orm() {

    initialize_metamodel();

    // Add all objects
    metamodel_add_objects();

    // Add all facts
    metamodel_add_facts();

    // Add all constraints
    
    // Convert to Rel
    parse_to_rel();

    // Add shadows
    add_shadows();

    console.log(metamodel);
}

function initialize_metamodel() {
    metamodel = { Object: {}, Fact: {}, SubtypeFact: {}, Constraint: {} };
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
        // Get shadowing information
        var matchlist = metamodel_match_fact( orm.rbgroups[rbgID] );
        // Create new fact
        var mmID = `metamodel-fact-${n}`;
        n += 1;
        ormjs2mm[rbgID] = mmID;
        metamodel.Fact[mmID] = metamodel_fact(mmID, orm.rbgroups[rbgID]);
        // Add shadowing information
        console.log(matchlist);
        if (matchlist.length > 0) {
            for (var n in matchlist) {
                var rbgIDn = key_from_value(ormjs2mm, matchlist[n]);
                if (rbgIDn != rbgID) {
                    metamodel.Fact[matchlist[n]]._Shadows.push( rbgID );
                    metamodel.Fact[mmID]._Shadows.push( rbgIDn );
                }
            }
        }
    }

    // Update object played roles
    for ( var objID in metamodel.Object ) {
        metamodel.Object[objID].PlayedRoles = 
            metamodel.Object[objID].PlayedRoles.map( e => ormjs2mm[e] );
    }

    // Add subtype facts

}

/* Add objects to metamodel */

function metamodel_add_entities() {

    /* Add entities to the metamodel, being careful to recognize duplicates. */

    var n = 0;
    for (var objID in orm.entities ) {
        matchID = metamodel_match_object( orm.entities[objID] );
        if (!matchID) {
            mmID = `metamodel-entity-${n}`;
            n += 1;
            ormjs2mm[objID] = mmID;
            metamodel.Object[mmID] = metamodel_entity(mmID, orm.entities[objID]);
        } else {
            ormjs2mm[objID] = matchID;
            metamodel.Object[matchID]._Shadows.push( objID );
            metamodel.Object[matchID].PlayedRoles.push.apply( metamodel.Object[matchID].PlayedRoles,
                                                              object_plays_roles(orm.entities[objID]) );
        }
    }
}

function metamodel_entity(mmID, object) {

    /* We are just adding the rolebox names for PlayedRoles.
       The ids will be changed once we recognize duplicate facts. */

    var d = object.datum();
    var obj = { 
        id: mmID, 
        type: "EntityType",
        Name: d.name,
        ReferenceMode: d.refmode,
        PlayedRoles: object_plays_roles(object),
        PreferredIdentifier: "",
        _Shadows: [object.attr("id")]
    }
    return obj
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

function metamodel_add_values() {

    var n = 0;
    for (var objID in orm.values ) {
        matchID = metamodel_match_object( orm.values[objID] );
        if (!matchID) {
            mmID = `metamodel-value-${n}`;
            n += 1;
            ormjs2mm[objID] = mmID;
            metamodel.Object[mmID] = metamodel_value(mmID, orm.values[objID]);
        } else {
            ormjs2mm[objID] = matchID;
            metamodel.Object[matchID]._Shadows.push( objID );
            metamodel.Object[matchID].PlayedRoles.push.apply( object_plays_roles(orm.values[objID]) );
        }
    }
    // Need to add refmode from entities
}

function metamodel_value(mmID, object) {
    var d = object.datum();
    var obj = { 
        id: mmID, 
        type: "ValueType",
        Name: d.name,
        PlayedRoles: object_plays_roles(object),
        ConceptualDataType: "",
        _Shadows: [object.attr("id")]
    }
    return obj
}

/* Add facts to metamodel */

function metamodel_match_fact(rbgroup) {

    /* TO DO: If FactRole not an exact match, add to Fact. 
       OR: have a separate shadow concept for relname matches 
           that aren't exact matches. (But then we need rel code that extends
           across facts. Regardless we have rel code that extends across readings.) */

    // Get the factroles format for the rbgroup we are checking
    var rbg_factroles = metamodel_add_roles("test", rbgroup);

    // Determine which values need to match for shadowing
    //    Note: Shadows have the same fact name but may have other differing information,
    //          like entities they connect to, constraints, etc.
    var factlist = [];
    var matchlist = ["Multiplicity", "RolePlayer", "Name"];
    if (shortFormat && graphFormat) { matchlist = ["Multiplicity", "RolePlayer"]; }
    else if (shortFormat && !graphFormat) { matchlist = ["Multiplicity", "Name"]; }

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
        } else if ( metamodel.Fact[factID]._Name == rbgroup.datum().name &&
                    matchlist.includes("Name") ) {
            match = true;
        } else { match = false; }
        
        if (match) { factlist.push( factID ); }
    }

    return factlist
}

function metamodel_fact(mmID, rbgroup) {
    
    var obj = {
        id: mmID,
        type: "FactType",
        FactRoles: metamodel_add_roles(mmID, rbgroup),
        ReadingOrders: metamodel_reading_orders(rbgroup),
        InternalConstraints: [],
        _Name: rbgroup.datum().name,
        _Shadows: [ rbgroup.attr("id") ]
    }

    return obj
}

function metamodel_add_roles(factID, rbgroup) {

    /* Convert each rolebox in the fact into a fact object. */

    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    var multmap = map_multiplicity(rbgroup);

    var factroles = {};
    for (var n in boxes) {
        var mmID = `${factID}-role-${n}`;
        factroles[n] = metamodel_role(mmID, orm.roleboxes[boxes[n]], multmap);
        ormjs2mm[boxes[n]] = mmID;
    }

    return factroles
}

function metamodel_role(mmID, rbox, multmap) {

    var d = rbox.datum();

    var obj = {
        id: mmID,
        Name: d.name,
        IsMandatory: d.mandatory,
        Multiplicity: multmap[d.multiplicity],
        RolePlayer: ormjs2mm[ d.entity ]
    }
    return obj
}

function map_multiplicity(rbgroup) {

    /* Map from ORMJS label for box to ORM metamodel label */

    var multmap = {};
    multmap[mult_param.one] = "ExactlyOne";
    multmap[mult_param.many] = "ZeroToMany";

    // Get multiplicity of all boxes
    var multlist = [];
    var boxes = rbgroup.datum().boxes;
    for (var n in boxes) {
        multlist.push( orm.roleboxes[boxes[n]].datum().multiplicity )
    }
    if ( multlist.includes(mult_param.many) ) {
        multmap[mult_param.none] = "ExactlyOne";
        multmap[mult_param.skip] = "ExactlyOne";
    } 
    else {
        multmap[mult_param.none] = "ZeroToMany";
        multmap[mult_param.skip] = "ZeroToMany";
    }

    return multmap
}

function metamodel_reading_orders(rbgroup) {

    /* Add reading orders to fact */

    var reading_order = {};

    // Create forward reading order
    var ronum = 0;
    reading_order[ronum] = metamodel_forward_reading_order(rbgroup,ronum);
    ronum += 1;

    return reading_order
}

function metamodel_forward_reading_order(rbgroup,ronum) {

    /* Create all readings that use the forward reading order.
       TO DO: Don't use boxes for role sequence and readings, use
              indices from FactRoles.
     */

    var roID = `${rbgroup.attr("id")}-reading-order-${ronum.toString()}`;
    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    // Get first entity
    var entityID = orm.roleboxes[boxes[0]].datum().entity;
    console.log('entityID', entityID, ormjs2mm[ entityID ])
    
    // Get all readings
    // Basic reading (no constraints)
    var readings = [metamodel_forward_reading(rbgroup)];
    // Mandatory constraints
    // TO DO
    // Uniqueness constraints
    // TO DO
    
    // Organize as a reading order
    var obj = {
        id: roID,
        Readings: readings,
        RoleSequence: [...boxes.keys()],
        _FirstEntity: ormjs2mm[ entityID ]
    }

    return obj
}

function metamodel_forward_reading(rbgroup) {

    /* This is the most basic reading of n-ary facts.  */
    
    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    
    // Add first box
    var data = `\{0\} ${orm.roleboxes[boxes[0]].datum().name}`; // A string of the reading
    var expanded_data = []; // Broken down as entity indices and text
    expanded_data.push( {RoleIndex: 0, FollowingText: orm.roleboxes[boxes[0]].datum().name} );
    
    if( boxes.length > 1 ) {
        
        // Add second box (this is separate because may not have name)
        if ( orm.roleboxes[boxes[1]].datum().name.length > 0 ) {
            data += ` ${orm.roleboxes[boxes[1]].datum().name}`;
        }
        data += ` \{1\}`;
        expanded_data.push( {RoleIndex: 1, 
                             PrecedingText: orm.roleboxes[boxes[1]].datum().name} );
        
        // Add additional boxes
        var rng = range(boxes.length-2, startAt=2);
        for ( var n in rng ) {
            data += ` ${orm.roleboxes[ boxes[ rng[n] ] ].datum().name} \{${rng[n].toString()}\}`
            expanded_data.push( { RoleIndex: rng[n], 
                                  PrecedingText: orm.roleboxes[ boxes[ rng[n] ] ].datum().name } );
        }
    }
    
    // Organize as a Reading
    var obj = {
        id: `${rbgroup.attr("id")}-reading-0`,
        Data: data,
        ExpandedData: expanded_data,
        _ReadingType: "NaryForwardReading"
    }
    return obj   
}

/* Settings that determine how to determine if facts are shadowed */

/* Set whether to use Graph Rel format. This determines:
   1. whether to use modules for the fact relation name
   2. the behavior of Short Rel format (see below) */

   function set_graphformat() {
    if(d3.select("#graphFormat").property("checked")){
        graphFormat = true;
    } else {
        graphFormat = false;
    }
    parse_orm();
}

/* Set whether to use Short Rel format. This determines:
   1. whether to include relations as a part of the fact name 
      (if true, no relations in graph mode)
   2. whether to use entities for the fact name 
      (if true, no entities in non-graph mode) */

function set_shortformat() {
    if(d3.select("#shortFormat").property("checked")){
        shortFormat = true;
    } else {
        shortFormat = false;
    }
    parse_orm();
}

/* Helper */

function fact_from_role(roleID) {
    return {'factID': roleID.split("-").slice(0,3).join("-"), 
            'role': parseInt( roleID.split("-").slice(4,5) )}
}