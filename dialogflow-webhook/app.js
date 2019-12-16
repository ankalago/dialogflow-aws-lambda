'use strict';

const {WebhookClient, Card, Suggestion} = require('dialogflow-fulfillment');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const axios = require('axios');

var express = require('express');
const app = express();
const router = express.Router();

router.use(compression());
router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(awsServerlessExpressMiddleware.eventContext());

router.post('/', (request, response) => {
  const ciudades = [ 'Quito', 'Cuenca', 'Ambato' ];
  const actions = ['Agendamiento de Cita', 'Busqueda de Concesionario'];
  const tematicas = [ 'Inteligencia Artificial', 'React', 'Firebase' ];
  const proxEvento = {
    dia: '20 de Febrero',
    hora: '6 pm',
    tema: 'Web Scraping'
  };
  const booleanOptions = {
    yes: 'Si',
    no: 'No'
  };
  const domain = {
    prod: 'https://www.ambacar.ec',
    staging: 'https://www.ambacar.ec',
    demo: 'https://www.ambacar.ec'
  };
  const sectores = ['norte', 'centro', 'sur', 'valles'];
  const api = {
      version: 'wp-json/wp/v2',
      per_page: '100'
  };
  const users = [
    {
      "name": "Paul Jacome",
      "identification": 1716724768,
      "vin": "8L4EF3A51EC000263",
      "email": "ankalago@gmail.com",
      "cellphone": "0998342013",
    },
    {
      "name": "Cristina Cordova",
      "identification": 1715352512,
      "vin": "8L4ED2A3XJC002344",
      "email": "huaynakilla@gmail.com",
      "cellphone": "0987877498",
    }
  ];

  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Hola!, soy Ambi. Bienvenido a Ambacar, puedo ayudarte con: ${actions.join(', ')}`);
    actions.forEach(action => agent.add(new Suggestion(action)));
  }

  function getAppointment(agent) {
    agent.add('Excelente, ahora me puedes ayudar con tu cédula:');
  }

  function getAppointmentAgain(agent) {
    agent.add('Por favor ayudame con tu cédula:');
  }

  function getIdentification(agent) {
    const {parameters} = agent;
		const identification = parameters.number.join('');
    agent.add(`tu cedula es: ${identification}?`);
  }

  function getIdentificationYes(agent) {
    const {parameters} = agent;
    const identification = parameters.number.join('');
    const user = users.find(user => user.identification == identification);
    agent.add(`Hola ${user.name} en que ciudad te encuentras?`);
  }

  function getDealer(agent) {
    agent.add('Excelente, ahora puedes ayudarme la ciudad en la que te encuentras?');
  }

  async function getCity(agent) {
    const {parameters} = agent;
		const city = parameters.ciudad;
    const citiesDealerUrl = `${domain.prod}/${api.version}/concesionario?per_page=${api.per_page}&filter[meta_query][0][key]=ciudad&filter[meta_query][0][value]=${city}`;
    try {
      const citiesDealer = await axios.get(citiesDealerUrl);
      const dealerByCity = citiesDealer.data.map(dealer => dealer.title.rendered);
      if(dealerByCity.length) {
        agent.add(`Las Agencias disponibles en ${city} son: ${dealerByCity.join(', ')}`);
        // agent.add(`En qué sector de la ciudad de ${city} prefieres asistir?, elige entre ${sectores.join(', ')}`);
      } else {
        agent.add(`No existen agencias en ${city}, elige otra ciudad`);
      }
    } catch (error) {
      console.log('-------------- CATCH ------------');
      console.error(error);
      console.log('--------------------------');
    }
  }

  function getAgency(agent) {
    const {parameters} = agent;
		const agency = parameters.agency;
    agent.add(`Genial, Aquí tienes la ubicación de la agencia`);
    agent.add(
			new Card({
				title: `Agencia ${agency}`,
				imageUrl: 'https://i.ibb.co/XttcJ2P/Screen-Shot-2019-12-15-at-11-29-35-PM.png',
				text: 'Av. Granados y Eloy Alfaro Esquina Telf: (02) 334-4011 / (02) 334-4039 / (02) 334-3788',
				buttonText: 'Como llegar',
				buttonUrl: 'https://maps.google.com'
			})
		);
  }

  function getSector(agent) {
    const {parameters} = agent;
		const sector = parameters.sector.toLowerCase();
    if (sectores.includes(sector)) {
      agent.add(`Genial, te puedo ayudar a encontrar charlas o talleres en el ${sector} o eventos en línea.
          ¿Por cuál te gustaría empezar?`);
      agent.add(new Suggestion('Talleres'));
      agent.add(new Suggestion('Live'));
    } else {
      agent.add(`Oh! aun no hay eventos en tu ciudad, pero el próximo Platzi Live es el día ${proxEvento.dia}
        a la ${proxEvento.hora} sobre ${proxEvento.tema}`);
    }
  }

  function detallePlatziLive(agent) {
		agent.add(`el próximo Platzi Live es el día ${proxEvento.dia} 
			a la ${proxEvento.hora} sobre ${proxEvento.tema}`);
  }

  function seleccionTematica(agent) {
		agent.add(`Super a mi también me encantan los retos. Estos son los temas que se van a cubrir proximamente en
				tu ciudad ${tematicas.join(', ')}. ¿Cuál temática te gustaría?`);
		agent.add(new Suggestion(tematicas[0]));
		agent.add(new Suggestion(tematicas[1]));
		agent.add(new Suggestion(tematicas[2]));
	}

	function detalleTaller(agent) {
		agent.add(
			`El sabado 26 de octubre, tenemos un taller sobre React Js en Ruta N, a las 7:00 pm. ¿Te gustaría asistir?`
		);
		agent.add(new Suggestion(booleanOptions.yes));
		agent.add(new Suggestion(booleanOptions.no));
	}

	function registroTaller(agent) {
		agent.add(`OK, solo falta un detalle: debes registrarte en la plataforma Meetup. ¿Te gustaría explorar
				algo más?. Solo dí: Quiero información de otra plática o taller o evento en línea`);
		agent.add(
			new Card({
				title: 'Registro en Meetup',
				imageUrl: 'https://secure.meetupstatic.com/s/img/786824251364989575000/logo/swarm/m_swarm_630x630.png',
				text: 'Registrate en Meetup :)',
				buttonText: 'Registrarme',
				buttonUrl: 'https://secure.meetup.com/es/register/'
			})
		);
	}

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  // intents cita
  intentMap.set('Default Welcome Intent - cita', getAppointment);
  intentMap.set('Default Welcome Intent - cita - select.number', getIdentification);
  // intents cita yes
  intentMap.set('Default Welcome Intent - cita - select.number - yes', getIdentificationYes);
  //intents cita no
  intentMap.set('Default Welcome Intent - cita - select.number - no', getAppointmentAgain);

  // intents agencia
  intentMap.set('Default Welcome Intent - concesionario', getDealer);
  intentMap.set('Obtener Agencia', getAgency);

  intentMap.set('Obtener Ciudad', getCity);
	intentMap.set('Live', detallePlatziLive);
	intentMap.set('Taller', seleccionTematica);
	intentMap.set('Seleccion Taller', detalleTaller);
	intentMap.set('Seleccion Taller - yes', registroTaller);
  agent.handleRequest(intentMap);
});

app.use('/', router);

module.exports = app;
