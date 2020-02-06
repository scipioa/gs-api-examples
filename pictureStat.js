const { api_key } = require("./key")
const superagent = require("superagent")
const _ = require("lodash")
const path = require("path")
const fs = require("fs")
const Promise = require("bluebird")
const moment = require("moment")

const smalltext = "67418307_2.jpg"

async function listPictures(query = {}) {
	try {
		console.log("List pictures...")
		const res = await superagent.get("https://api.grand-shooting.com/v3/picture")
			.set("Authorization", "Bearer " + api_key)
			.query(query)

		return res.body
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/picture", err)
		return []
	}
}

async function getPicture(picture_id) {
	try {
		console.log("get picture...")
		const res = await superagent.get("https://api.grand-shooting.com/v3/picture/" + picture_id)
			.set("Authorization", "Bearer " + api_key)

		return res.body
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/picture", err)
		return []
	}
}

async function start() {
	const pictures = await listPictures({ benchsteptype: 40, smalltext: smalltext, bench_root_id: 8 })
	const picture = _.first(pictures)

	if (!picture) {
		console.log('No picture found')
		return
	}

	let pictureSource = { ...picture }
	
	while (pictureSource.parent_id) {
		pictureSource = await getPicture(pictureSource.parent_id)
	}

	const time = moment(picture.date_cre).to(moment(pictureSource.date_cre), true)
	console.log('Editing time:', time)
}

start()