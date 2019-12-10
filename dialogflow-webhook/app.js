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

  const api = {
      version: 'wp-json/wp/v2',
      per_page: '100'
  };

  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  async function obtenerCiudad(agent) {
    const {parameters} = agent;
		const city = parameters.ciudad;
    const citiesDealerUrl = `${domain.prod}/${api.version}/concesionario?per_page=${api.per_page}&filter[meta_query][0][key]=ciudad&filter[meta_query][0][value]=${city}`;
    try {
      const citiesDealer = await axios.get(citiesDealerUrl);
      agent.add(`Las Agencias disponibles en ${city} son: `);
      citiesDealer.data.map(dealer => {
        agent.add(new Suggestion(dealer.title.rendered));
      });

      // if (ciudades.includes(agent.parameters.ciudad)) {
      // 	agent.add(`Genial, te puedo ayudar a encontrar charlas o talleres en ${agent.parameters.ciudad} o eventos en línea.
      // 			¿Por cuál te gustaría empezar?`);
      // 	agent.add(new Suggestion('Talleres'));
      // 	agent.add(new Suggestion('Live'));
      // } else {
      // 	agent.add(`Oh! aun no hay eventos en tu ciudad, pero el próximo Platzi Live es el día ${proxEvento.dia}
      // 		a la ${proxEvento.hora} sobre ${proxEvento.tema}`);
      // }

    } catch (error) {
      console.log('-------------- CATCH ------------');
      console.error(error);
      console.log('--------------------------');
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
  intentMap.set('Obtener Ciudad', obtenerCiudad);
	intentMap.set('Live', detallePlatziLive);
	intentMap.set('Taller', seleccionTematica);
	intentMap.set('Seleccion Taller', detalleTaller);
	intentMap.set('Seleccion Taller - yes', registroTaller);
  agent.handleRequest(intentMap);
});

app.use('/', router);

module.exports = app;
