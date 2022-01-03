/* 
    Convert d3 data to ORM metamodel.

    Note the design here is to make a full pass over the model whenever 
    parse_orm() is triggered. So no incremental updates. However, the
    individual update functions are designed to make it easier to add
    functions for incremental updates in the future.

    This functionality is screaming to be handled with classes. TO DO.
 */

/* Globals */
var orm; // Defined in parse-svg
var conntypes;
var metamodel; // Defined here
var ormjs2mm; // Defined here
var mult_param; // Defined in rolebox-constructor

var graphFormat = false; // Defined here
var shortFormat = true; // Defined here

/* Classes */

class EntityType {
    id;
    type = "EntityType";
    Name;
    ReferenceMode;
    PlayedRoles = [];
    PreferredIdentifier = "";
    _Shadows;
    _RelName;
    _Atom = "";

    constructor(n,entity) {
        var d = entity.datum();
        this.id = `metamodel-entity-${n.toString()}`;
        this.Name = d.name;
        this.ReferenceMode = d.refmode;
        this.PlayedRoles = object_plays_roles(entity);
        this._Shadows = [ entity.attr("id") ];
    }

    extend(entity) {
        // Extend the EntityType instance with attributes from shadow, entity
        // Add shadow
        this._Shadows.push( entity.attr("id") );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, object_plays_roles( entity ) );
    }
}

class ValueType {
    id;
    type = "ValueType";
    Name;
    PlayedRoles = [];
    ConceptualDataType = "";
    _Shadows;
    _RelName;
    _Atom = "";

    constructor(n,value) {
        var d = value.datum();
        this.id = `metamodel-value-${n.toString()}`;
        this.Name = d.name;
        this.PlayedRoles = object_plays_roles(value);
        this._Shadows = [ value.attr("id") ];
    }

    extend(value) {
        // Extend the ValueType instance with attributes from shadow, value
        // Add shadow
        this._Shadows.push( value.attr("id") );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, object_plays_roles( value ) );
    }
}

class Reading {
    
    id;
    Data = null;
    ExpandedData = [];
    _rbgID;
    _factID;
    _roID;
    _rnum;
    _ronum;
    _ReadingType = null;
    _RelData = [];
    _Statement = null;
    _RelStatement = [];
    _includedIDs = [];

    constructor(n,ro) {
        var factID = ro._factID;
        this.id = `${factID}-reading-${n.toString()}`;
        this._rbgID = ro._rbgID;
        this._factID = factID;
        this._roID = ro.id;
        this._rnum = n;
        this._ronum = ro._ronum;
    }

    set_reading(readingtype, rolen = 0) {
        this._ReadingType = readingtype;
        if (this._ReadingType == "NaryForwardReading") {
            metamodel_forward_reading( this );
        }
        else if (this._ReadingType == "MandatoryForwardReading") {
            metamodel_mandatory_reading(this, rolen);
        }
    }

}

class ReadingOrder {
    
    id;
    Reading = [];
    RoleSequence = [];
    _rbgID;
    _factID;
    _ronum;
    _FirstEntity = null;
    _RelName = null;
    

    constructor(n,fact) {
        this.id = `${fact.id}-reading-order-${n.toString()}`;
        this._factID = fact.id
        this._rbgID = fact._rbgID;
        this._ronum = n;
    }

    set_sequence(direction) {
        if(direction == "forward") { metamodel_forward_reading_order( this ); }
    }

}

class Role {
    id;
    Name;
    IsMandatory = false;
    Multiplicity = "None";
    RolePlayer = null;
    _rboxID;
    _rolenum;
    _factID;

    constructor(n, rboxID, fact) {
        
        var d = orm.roleboxes[rboxID].datum();
        
        this.id = `${fact.id}-role-${n.toString()}`;
        this.Name = d.name;
        this.IsMandatory = d.mandatory;
        this.Multiplicity = fact._multmap[d.multiplicity];
        this.RolePlayer = ormjs2mm[ d.entity ];
        this._rboxID = rboxID;
        this._rolenum = n;
        this._factID = fact.id;
    }

}

class Fact {
    
    id;
    type = "FactType";
    FactRoles = [];
    ReadingOrder = [];
    InternalConstraints = [];
    _Name;
    _rbgID;
    _Shadows;
    _multmap;

    constructor(n, rbgID) {
        this.id = `metamodel-fact-${n.toString()}`;
        this._rbgID = rbgID;
        this.InternalConstraints = [];
        this._Name = orm.rbgroups[rbgID].datum().name;
        this._multmap = map_multiplicity(orm.rbgroups[rbgID]);
        this.FactRoles = metamodel_add_roles(this, orm.rbgroups[rbgID]);
        this._Shadows = [ rbgID ];
    }

    populate_shadows() {
        // Get shadowing information
        var matchlist = metamodel_match_fact( this );
        
        // Add shadowing information
        if (matchlist.length > 0) {
            for (var n in matchlist) {
                var rbgIDn = key_from_value(ormjs2mm, matchlist[n]);
                if (rbgIDn != this._rbgID) {
                    metamodel.Fact[matchlist[n]]._Shadows.push( this._rbgID );
                    this._Shadows.push( rbgIDn );
                }
            }
        }
    }

    populate_reading_orders() {
        metamodel_reading_orders( this );
    }

}

/* Main functions */

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
        var f = new Fact(n,rbgID);
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
       and/or graphFormat. The facts match if they have the same *fact name*, even if the
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

function metamodel_add_roles(fact, rbgroup) {

    /* Convert each rolebox in the fact into a fact object. */

    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }

    var factroles = [];
    for (var n in boxes) {
        factroles[n] = new Role(n, boxes[n], fact);
    }

    return factroles
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

function metamodel_reading_orders( fact ) {

    /* Add reading orders to fact */

    // Create forward reading order
    var ronum = 0;
    var ro = new ReadingOrder(ronum, fact);
    fact.ReadingOrder.push( ro );
    ro.set_sequence("forward");
    ronum += 1;
    
    // Create backward reading order
}

function metamodel_forward_reading_order(ro) {

    /* Create all readings that use the forward reading order. */

    // Get ordered list of roles
    var factroles = metamodel.Fact[ro._factID].FactRoles;
    ro.RoleSequence = [...factroles.keys()];
    ro._FirstEntity = factroles[0].RolePlayer;
    
    // Basic reading (no constraints)
    rnum = 0;
    var r = new Reading(rnum, ro);
    //console.log("r 1", r);
    r.set_reading("NaryForwardReading");
    //console.log("r 2",r);
    ro.Reading.push(r);
    rnum += 1;
    
    // Mandatory constraints
    for (var n in factroles) {
        if( factroles[n].IsMandatory == true) {
            var rmand = new Reading(rnum, ro);
            ro.Reading.push(rmand);
            rmand.set_reading("MandatoryForwardReading",rolen=n);
            //metamodel_mandatory_reading(rmand, n);
            rnum += 1;
        }
    }
    //readings.push.apply(readings, metamodel_mandatory_constraints(rbgroup));
    
    // Uniqueness constraints
    // TO DO
    
}

function metamodel_forward_reading(reading) {

    /* This is the most basic reading of n-ary facts.  */
    
    // Get ordered list of roles
    var factroles = metamodel.Fact[reading._factID].FactRoles;
    var rs = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum].RoleSequence;

    // Add first box
    var data = `\{${rs[0]}\} ${factroles[rs[0]].Name}`; // A string of the reading
    var expanded_data = []; // Broken down as entity indices and text
    expanded_data.push( {RoleIndex: rs[0], 
                         FollowingText: factroles[rs[0]].Name} );
    
    if( rs.length > 1 ) {

        // Add second box (this is separate because may not have name)
        if ( factroles[rs[1]].Name.length > 0 ) {
            data += ` ${factroles[rs[1]].Name}`;
        }
        data += ` \{${rs[1]}\}`;
        expanded_data.push( {RoleIndex: rs[1], 
                             PrecedingText: factroles[rs[1]].Name} );
        
        
        // Add additional boxes
        var rng = range(rs.length-2, startAt=2);
        for ( var n in rng ) {
            data += ` ${factroles[ rs[rng[n]] ].Name} \{${rs[rng[n]].toString()}\}`
            expanded_data.push( { RoleIndex: rs[rng[n]], 
                                  PrecedingText: factroles[ rs[rng[n]] ].Name } );
        }
    }
    
    // Organize as a Reading
    reading.Data = data;
    reading.ExpandedData = expanded_data;
    reading._ReadingType = "NaryForwardReading";

}

function metamodel_mandatory_reading(reading, rolen) {

    // Get basic forward reading, if it exists.
    var fwd_reading = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum].Reading[0];
    if (! fwd_reading._ReadingType == "NaryForwardReading" ) { return }
    // Mandatory reading extends basic forward reading.
    var data = `For every {${rolen}}, `;
    data += fwd_reading.Data;
    var expanded_data = [...fwd_reading.ExpandedData];
    expanded_data.splice(0,0, { RoleIndex: rolen, PrecedingText: "For every" });

    // Organize as a Reading
    reading.Data = data;
    reading.ExpandedData = expanded_data;
    reading._ReadingType = "MandatoryForwardReading";

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
