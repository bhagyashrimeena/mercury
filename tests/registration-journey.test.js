import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationFormMarkup } from '../public/registration-journey.js';
import { eventDetailMarkup } from '../public/event-detail.js';

const event = {id:'native-game',title:'Club Rally',price:450,paymentMethods:['upi'],qrImage:'/api/events/native-game/qr',host:'Club',hostContact:'host@example.test'};
const user = {name:'<Player>',email:'player@example.test',level:'Intermediate'};

test('UPI form prefills verified profile details and provides a separate payment panel', () => {
 const html=registrationFormMarkup(event,user);
 assert.match(html,/value="&lt;Player&gt;"/);
 assert.match(html,/value="player@example.test" readonly required/);
 assert.match(html,/<option selected>Intermediate/);
 assert.match(html,/data-registration-panel="payment" hidden/);
 assert.match(html,/src="\/api\/events\/native-game\/qr"/);
 assert.match(html,/name="proof"/);
 assert.match(html,/pending in My games/);
});

test('cash is a single-step form with separate organizer payment and no receipt upload', () => {
 const html=registrationFormMarkup({...event,paymentMethods:['cash'],qrImage:''},user);
 assert.doesNotMatch(html,/data-registration-panel="payment"|name="proof"|<img/);
 assert.match(html,/organizer will receive payment separately/);
 assert.match(html,/value="cash" selected/);
});

test('free entry has no payment fields; mixed-method entries expose both choices', () => {
 const free=registrationFormMarkup({...event,price:0},user);
 assert.doesNotMatch(free,/name="paymentMethod"|name="proof"|name="paymentConsent"/);
 const mixed=registrationFormMarkup({...event,paymentMethods:['upi','cash']},user);
 assert.match(mixed,/value="upi"/);assert.match(mixed,/value="cash"/);
});

test('native event detail uses Register now for both free and paid entry', () => {
 const detail={...event,sport:'Badminton',area:'Powai',venue:'Club Court',date:'2030-12-22',time:'18:00',startsAt:Date.parse('2030-12-22T12:30:00Z'),status:'published',spots:2,capacity:10,level:'All levels',included:[]};
 for(const price of [0,450]) assert.match(eventDetailMarkup({...detail,price}),/>Register now &#8599;<\/a>/);
});
