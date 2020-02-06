const { api_key } = require("./key")
const superagent = require("superagent")
const _ = require("lodash")
const path = require("path")
const fs = require("fs")
const Promise = require("bluebird")

const _catalog = [
	{
		ref: "67418222",
		product_ref: "67418221",
		ean: "9009655144214",
		family: "SH_2112",
		gamme: "PF23 Bijouterie et joaillerie PSF111 Bijoux PSSF344 Colliers et pendentifs",
		univers: "PU8 Femme",
		sku: "67418221_475",
		eans: ["67418221_475"]
	},
	{
		ref: "67418307",
		product_ref: "67418306",
		ean: "9009655239910",
		family: "SH_2116",
		gamme: "PF23 Bijouterie et joaillerie PSF111 Bijoux PSSF342 Boucles d'oreilles ",
		univers: "PU8 Femme ",
		sku: "67418306_56",
		eans: ["67418306_56"]
	},
]

async function listProductions() {
	try {
		console.log("List productions...")
		const res = await superagent.get("https://api.grand-shooting.com/v3/production")
			.set("Authorization", "Bearer " + api_key)

		return res.body
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/production", err)
		return []
	}
}

async function uploadImages(bench = {}, images = []) {
	try {
		console.log("Upload images...")
		const agent = superagent.post("https://api.grand-shooting.com/v3/production/" + bench.root_id + "/bench/" + bench.bench_id + "/upload")
			.set("Authorization", "Bearer " + api_key)
			.field('wait', true) //to wait for the end of the request

		_.forEach(images, image => {
			agent.attach('file', image.path, image.name)
		})

		const res = await agent
		return res.body
	} catch (err) {
		console.error("error on upload", err)
		return []
	}
}

async function importReference(reference = {}) {
	try {
		console.log("Import reference...")
		const res = await superagent.post("https://api.grand-shooting.com/v3/reference")
			.set("Authorization", "Bearer " + api_key)
			.send(reference)

		console.log(res.body)
		return res.body
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/reference", err)
		return []
	}
}

async function importCalatog(references) {
	try {
		console.log("Import catalog...")
		const res = await superagent.post("https://api.grand-shooting.com/v3/reference/bulk")
			.set("Authorization", "Bearer " + api_key)
			.send(references)

		console.log(res.body)
		return res.body
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/reference/bulk", err)
		return []
	}
}

async function setUrgent(ref = "") {
	try {
		console.log("setUrgent...")
		const res = await superagent.get("https://api.grand-shooting.com/v3/reference")
			.set("Authorization", "Bearer " + api_key)
			.query({ ref: ref })

		const reference = _.first(res.body)
		if (reference) {
			reference.tags = reference.tags || []
			reference.tags.push("Urgent")

			return await importReference(reference)
		} else {
			return {}
		}
	} catch (err) {
		console.error("error on https://api.grand-shooting.com/v3/production", err)
		return []
	}
}

async function _listImages() {
	const directoryPath = path.join(__dirname, 'misc');

	try {
		let images = await fs.promises.readdir(directoryPath)
		images = _.map(images, image => {
			return {
				path: path.join(directoryPath, image),
				name: image
			}
		})

		return images
	} catch (err) {
		console.error(err);
		return []
	}
}

async function start() {
	const productions = await listProductions()
	const production = _.find(productions, benches => {
		return _.find(benches, bench => _.startsWith(bench.smalltext, "LOT "))
	})

	const images = await _listImages()
	const bench = _.find(production, bench => bench.benchsteptype === 10)

	await uploadImages(bench, images)

	await importCalatog(_catalog)

	const reference = _.first(_catalog)
	await setUrgent(reference.ref)
}

start()