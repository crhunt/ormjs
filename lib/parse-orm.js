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

function parse_orm() {

    initialize_metamodel();

    // Add all objects
    metamodel_add_objects();

    // Add all facts
    metamodel_add_facts();

    // Add all constraints

    // Add shadows
    add_shadows();
    
    // Convert to Rel
    parse_to_rel();

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
        var matchID = metamodel_match_fact( orm.rbgroups[rbgID] );
        if (!matchID) {
            var mmID = `metamodel-fact-${n}`;
            n += 1;
            ormjs2mm[rbgID] = mmID;
            metamodel.Fact[mmID] = metamodel_fact(mmID, orm.rbgroups[rbgID]);
        } else {
            ormjs2mm[rbgID] = matchID;
            metamodel.Fact[matchID]._Shadows.push( rbgID );
        }
    }

    // Update object played roles

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
            metamodel.Object[matchID].PlayedRoles.push.apply( object_plays_roles(orm.entities[objID]) );
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

    var rbg_factroles = metamodel_add_roles("test", rbgroup);

    for (var factID in metamodel.Fact) {
        var factroles = metamodel.Fact[factID].FactRoles;
        var match = true;
        if ( factroles.length == rbg_factroles.length) {
            for (var n in factroles) {
                if ( factroles[n]._Name != rbg_factroles[n]._Name ||
                     factroles[n].Multiplicity != rbg_factroles[n].Multiplicity ||
                     factroles[n].RolePlayer != rbg_factroles[n].RolePlayer ) {
                         match = false;
                }
            }
        } else { match = false }
        if (match) { return factID }
    }

    return false
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

    /* Create all readings that use the forward reading order */

    var roID = `${rbgroup.attr("id")}-reading-order-${ronum.toString()}`;
    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    
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
        RoleSequence: [...boxes.keys()]
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
        ExpandedData: expanded_data
    }
    return obj
    
}