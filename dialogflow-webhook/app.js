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
  const keyStaticGmap = 'AIzaSyByD-OWfjKQwcnWiOED4uVNYCe2Voiyw5U';
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
  const timeZone = 'America/Guayaquil';
  const timeZoneOffset = '-05:00';
  const dateTimeNow = new Date().toISOString();
  const dateNow = dateTimeNow.split("T")[0].slice(0, 10);
  const timeNow = dateTimeNow.split("T")[1].slice(0, 8);
  const locales = 'es-EC';

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

  async function getDealFromApi (city) {
    const citiesDealerUrl = `${domain.prod}/${api.version}/concesionario?per_page=${api.per_page}&filter[meta_query][0][key]=ciudad&filter[meta_query][0][value]=${city}`;
    try {
      const citiesDealer = await axios.get(citiesDealerUrl);
      return citiesDealer.data;
    } catch (error) {
      console.log('-------------- CATCH ------------');
      console.error(error);
      console.log('--------------------------');
    }
  }

  async function postReservation (identification, date, time) {
    const url = 'https://hooks.slack.com/services/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';
    const data = {
      "text": "Se ha creado una cita desde el asistente con los siguientes datos:",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Se ha creado una cita desde el asistente con los siguientes datos:*"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Identificación:* ${identification}`
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Fecha:* ${date}`
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*Hora:* ${time}`
          }
        }
      ]
    };
    try {
      const postData = await axios.post(url, data);
      return postData.data;
    } catch (error) {
      console.log('-------------- CATCH ------------');
      console.error(error);
      console.log('--------------------------');
    }
  }

  async function getCity(agent) {
    const {parameters} = agent;
		const city = parameters.ciudad;
    const dataFromApi = await getDealFromApi(city);
    const dealerByCity = dataFromApi.map(dealer => dealer.title.rendered);
    if(dealerByCity.length) {
      agent.add(`Las Agencias disponibles en ${city} son: ${dealerByCity.join(', ')}`);
      // agent.add(`En qué sector de la ciudad de ${city} prefieres asistir?, elige entre ${sectores.join(', ')}`);
    } else {
      agent.add(`No existen agencias en ${city}, elige otra ciudad`);
    }
  }

  async function getImageMapAgency (name, position, key) {
    return `https://maps.googleapis.com/maps/api/staticmap?zoom=17&size=600x400&maptype=roadmap&markers=color:red|label:${name}|${position}&key=${key}`;
  }

  function formatDateTime (dateInput, timeInput, locales, timeZone) {
    const date = !!dateInput ? dateInput : "";
    const time = !!timeInput ? timeInput : `${dateNow}T${timeNow}${timeZoneOffset}`;
    const formatDateTime = new Date(
        Date.parse(
            `${date.split("T")[0]}T${time.split("T")[1].split("-")[0]}${timeZoneOffset}`
        )
    );
    const formatDateString = formatDateTime.toLocaleString(locales, {
      month: "long",
      day: "numeric",
      timeZone: timeZone
    });
    const formatTimeString = formatDateTime.toLocaleString(locales, {
      hour: "numeric",
      minute: "numeric",
      timeZone: timeZone
    });
    return {
      formatDate: formatDateString,
      formatTime: formatTimeString
    };
  }

  async function getAgency(agent) {
    const {parameters, intent} = agent;
    const agency = parameters.agencia;
    const city = parameters.ciudad;
    const dealerByCity = await getDealFromApi(city);
    const agencyDealer = dealerByCity.length ? dealerByCity.find(dealer => dealer.title.rendered.toLowerCase().includes(agency.toLowerCase())) : [];
    const dealerName = agencyDealer.title.rendered;
    const coordenates = agencyDealer.acf.mapa;
    const address = agencyDealer.acf.direccion;
    const telephones = agencyDealer.acf.telefono.map(telephone => `${telephone.codigo_region} ${telephone.numero_de_telefono}`);
    const nameAgencyGMap = "ambacar granados";
    const imageMapDealer = await getImageMapAgency(dealerName, coordenates, keyStaticGmap);
    agent.add(`Genial, Aquí tienes la ubicación de la agencia`);
    // `https://maps.googleapis.com/maps/api/staticmap?zoom=17&size=600x400&maptype=roadmap&markers=color:red|label:${nameAgencyGMap}|${coordenates}&key=${keyStaticGmap}`,
    agent.add(
			new Card({
        title: nameAgencyGMap,
				imageUrl: imageMapDealer,
				text: `${address} - ${telephones.join(', ')}`,
				buttonText: 'Como llegar',
				buttonUrl: `https://www.google.com/maps/dir/?api=1&destination=${nameAgencyGMap}`
			})
    );
    intent === 'Obtener Agencia - cita' && agent.add(`Atendemos de lunes a viernes, que día te gustaria agendar?`);
  }

  function setReservationDate() {
    const {parameters} = agent;
    const dateInput = parameters.date;
    const timeInput = parameters.time;
    const dateTime = formatDateTime(dateInput, timeInput, locales, timeZone);
    const formatDateString = dateTime.formatDate;
    const formatTimeString = dateTime.formatTime;
    if (!!dateInput && !!!timeInput) {
      agent.add(`Excelente, el ${formatDateString} a que hora deseas la cita?`);
    } else if(!!dateInput && !!timeInput) {
      agent.add(`Excelente, se reservará una cita el ${formatDateString} a las ${formatTimeString}, deseas continuar con la reservación?`);
    }
  }

  async function confirmationReservation() {
    const {parameters} = agent;
    const identification = parameters.number;
    const dateInput = parameters.date;
    const timeInput = parameters.time;
    const dateTime = formatDateTime(dateInput, timeInput, locales, timeZone);
    const formatDateString = dateTime.formatDate;
    const formatTimeString = dateTime.formatTime;
    await postReservation(identification, formatDateString, formatTimeString);
    agent.add(`Tu cita ha sido reservada. Te esperamos el ${formatDateString} a las ${formatTimeString}`);
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
  intentMap.set('Obtener Agencia - cita', getAgency);
  intentMap.set('Reservation date', setReservationDate);
  intentMap.set('Reservation time', setReservationDate);
  intentMap.set('Reservation date - yes', confirmationReservation);
  intentMap.set('Reservation time - yes', confirmationReservation);

  intentMap.set('Obtener Ciudad', getCity);
  agent.handleRequest(intentMap);
});

app.use('/', router);

module.exports = app;
