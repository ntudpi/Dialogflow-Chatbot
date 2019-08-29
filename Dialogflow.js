'use strict';
//Basic Dialogflow variables
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

//Main function to handle request and response
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
	const agent = new WebhookClient({ request, response });

	//INTENT
	const WELCOME_INTENT = 'Default Welcome Intent';
	const FALLBACK_INTENT = 'Default Fallback Intent';
	const HOURS_INTENT = 'Hours';
	const BOOK_AMENITIES_INTENT = 'Book Amenities';
	const BOOK_AMENITIES_LWN_INTENT = 'Book Amenities - Lee Wee Nam Library';
	

	//ENTITY
	const LIBRARY_ENTITY = 'Library';
	const TERM_ENTITY = 'Term';
	const DATE_ENTITY = 'date';
	const TIME_ENTITY = 'time';
	const AMENITIES_ENTITY = 'Amenities';
	const VERB_ENTITY = 'Verb';
	const LEARNING_PODS_ENTITY = 'LearningPods';
	
	//Name of libraries
	const listOfLib = ['Lee Wee Nam Library', 'Business Library'];

	//Default welcome intent
	function welcome (agent) {
		agent.add(`Welcome to my agent!`);
	}

	//Default Fallback intent
	function fallback (agent) {
		agent.add(`I didn't understand`);
	}
	
	//HOURS Intent ==========================================================================================================================================================================================================================================================================================
	//to handle inquiry about operating hours ==========================================================================================================================================================================================================================================================================================
	
	function hours(agent){
		
		//double checking for intent call ==========================================================================================================================================================================================================================================================================================
		
		const verb = agent.parameters[VERB_ENTITY];
		if(verb !== 'open') return;
		
		const libName = agent.parameters[LIBRARY_ENTITY];
		const term = agent.parameters[TERM_ENTITY];
		const date = agent.parameters[DATE_ENTITY]?new Date(agent.parameters[DATE_ENTITY]):'';
		
		//slot filling ==========================================================================================================================================================================================================================================================================================
		
		if(!(listOfLib.includes(libName))){
			agent.add('Let me know the library');
		}else if(!(['School Term', 'Vacation Term'].includes(term))){
			agent.add('Let me know the term');
		}else{
			const openingHrs = {
			'Vacation Term':{
			'Lee Wee Nam Library':{
			'1':'8:30AM - 7:00PM',
			'2':'8:30AM - 7:00PM',
			'3':'8:30AM - 7:00PM',
			'4':'8:30AM - 7:00PM',
			'5':'8:30AM - 7:00PM',
			'6':'8:30AM - 5:00PM'

			},
			'Business Library':{
			'1':'8:30AM - 7:00PM',
			'2':'8:30AM - 7:00PM',
			'3':'8:30AM - 7:00PM',
			'4':'8:30AM - 7:00PM',
			'5':'8:30AM - 7:00PM',
			'6':'8:30AM - 5:00PM'
			}
			},
			'School Term':{
			'Lee Wee Nam Library':{
			'1':'8:30AM - 9:30PM',
			'2':'8:30AM - 9:30PM',
			'3':'8:30AM - 9:30PM',
			'4':'8:30AM - 9:30PM',
			'5':'8:30AM - 9:30PM',
			'6':'8:30AM - 5:00PM'
			},
			'Business Library':{
			'1':'8:30AM - 9:30PM',
			'2':'8:30AM - 9:30PM',
			'3':'8:30AM - 9:30PM',
			'4':'8:30AM - 9:30PM',
			'5':'8:30AM - 9:30PM',
			'6':'8:30AM - 5:00PM'
			}
			}
			};
			
			//Date is not mandatory ==========================================================================================================================================================================================================================================================================================
			//if date is given, system is able to give the specific date ==========================================================================================================================================================================================================================================================================================
			
			if(date === ""){
				agent.add(`Library opening hours are ${openingHrs[term][libName]['1']} on Monday-Friday and ${openingHrs[term][libName]['6']} on Saturday`);
			}else{

				const day = String(date.getDay());
				const dayDate = String(date.getDate());
				const month = String(date.getMonth());
				const year = String(date.getFullYear());

			if(day === '0'){
				agent.add('Library is closed on Sunday');
			}else{
				agent.add(`Library opening hours are ${openingHrs[term][libName][day]} on ${dayDate} ${month} ${year}`);
			}

			}

		}
	}
	
	//BookingAmenities Intent ==========================================================================================================================================================================================================================================================================================
	//to book the amenity WITHOUT the specific name ==========================================================================================================================================================================================================================================================================================
	//just choose general facility (learning pod, recording room) and check whether the facility is available in the library =============================================================================================================================================
	
	function bookAmenities(agent){
		agent.clearContext('lwnbookingcontext');
		const verb = agent.parameters[VERB_ENTITY];
		if(verb !== 'book') return;
		
		const libName = agent.parameters[LIBRARY_ENTITY];
		const amenities = agent.parameters[AMENITIES_ENTITY];
		const availableAmenities = {
			'Lee Wee Nam Library':['Circular Pod','Collaboration Booth','Learning Pod','Recording Room', 'Video Conferencing Room'],
			'Business Library':['Discussion Pods', 'Language Learning Room', 'Study Room']
		};
		
		//slot filling ==========================================================================================================================================================================================================================================================================================
		
		if(!([LWNLib, BusinessLib].includes(libName))){
			agent.add('Let me know which library you are referring to');
		}else if(amenities === ''){
			agent.add('Let me know which facility you want to book');
		}else if(!(availableAmenities[libName].includes(amenities))){
			agent.add(`${amenities} is not available at ${libName}`);
		}else{
			agent.add(`Which ${amenities} you want to book?`);
			
			//send context to follow-up intent ==========================================================================================================================================================================================================================================================================================
			//function is used to parse the name of context (the native function on dialogflow has unresolved bugs) ==========================================================================================================================================================================================================================================================================================//function is used to parse the name of context (the native function on dialogflow has unresolved bugs) ==========================================================================================================================================================================================================================================================================================
			
			switch(libName){
				case LWNLib:
					agent.setContext({
						'name':'lwnbookingcontext',
						'lifespan':5,
						'parameters':{
						LIBRARY_ENTITY : libName,
						AMENITIES_ENTITY : amenities
						}
					});
					break;
				case BusinessLib:
					agent.context.set({
						'name':'businessbookingcontext',
						'lifespan':5,
						'parameters':{
						LIBRARY_ENTITY : libName,
						AMENITIES_ENTITY : amenities
						}
					});
					break;				
				default: return;
			}			
		}

	}
	
	//BOOK Amenity entity ==========================================================================================================================================================================================================================================================================================
	//to book the specific amenity ==========================================================================================================================================================================================================================================================================================
	function bookAmenitiesLWN(agent){
		const lwnBookingContext = getContextName('lwnbookingcontext');
		const amenity = lwnBookingContext.parameters[AMENITIES_ENTITY];
		const libName = lwnBookingContext.parameters[LIBRARY_ENTITY];
		switch(amenity){
			case 'Learning Pod':
				const specific = agent.parameters[LEARNING_PODS_ENTITY];
				agent.add(`${specific} booked at ${libName}`);
				agent.clearContext('lwnbookingcontext');
				break;
			default:
				return;
        }
	}
	
	//function is used to parse the name of context (the native function on dialogflow has unresolved bugs) ==========================================================================================================================================================================================================================================================================================
	function getContextName(contextName){
		const allContext = request.body.queryResult.outputContexts;
		let name;
		let contextNameSplitter;
		let len;
		for(let context of allContext){
			contextNameSplitter = context.name.split("/");
			len = contextNameSplitter.length;
			let name = contextNameSplitter[len - 1];
			if(name === contextName) return context;
		}
	}
	
	//Mapping the function to intents in dialogflow ==========================================================================================================================================================================================================================================================================================
	let intentMap = new Map();
	intentMap.set(WELCOME_INTENT, welcome);
	intentMap.set(FALLBACK_INTENT, fallback);
	intentMap.set(HOURS_INTENT, hours);
	intentMap.set(BOOK_AMENITIES_INTENT, bookAmenities);
	intentMap.set(BOOK_AMENITIES_LWN_INTENT, bookAmenitiesLWN);
	agent.handleRequest(intentMap);
});







