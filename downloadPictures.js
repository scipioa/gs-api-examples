const { api_key } = require("./key")
const superagent = require("superagent")
const _ = require("lodash")
const path = require("path")
const fs = require("fs")
const Promise = require("bluebird")

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

async function downloadPicture(picture = {}) {
	const directoryPath = path.join(__dirname, 'download', picture.smalltext);

	try {
		console.log("Download picture...")
		const res = await superagent.get("https://api.grand-shooting.com/v3/picture/" + picture.picture_id + "/download")
			.set("Authorization", "Bearer " + api_key)

		return await fs.promises.writeFile(directoryPath, res.body)
	} catch (err) {
		console.error("error on download", err)
		throw err
	}
}

async function setDownloadOk(picture = {}) {
	try {
		console.log("Set download ok...")
		const res = await superagent.post("https://api.grand-shooting.com/v3/picture/" + picture.picture_id + "/picturestatus")
			.set("Authorization", "Bearer " + api_key)
			.send({
				picturestatus: 55
			})

		return res.body
	} catch (err) {
		console.error("error on picturestatus", err)
		throw err
	}
}

async function refusePicture(picture = {}, comment) {
	try {
		console.log("refuse picture...")
		const res = await superagent.post("https://api.grand-shooting.com/v3/picture/" + picture.picture_id + "/picturestatus")
			.set("Authorization", "Bearer " + api_key)
			.send({
				picturestatus: 31,
				comment: comment
			})

		return res.body
	} catch (err) {
		console.error("error on picturestatus", err)
		throw err
	}
}

async function start() {
	let picturesToDownload = []
	let pictures = await listPictures({ picturestatus: 50, benchsteptype: 40 }) //Attention à la paginnation
	pictures = _.uniqBy(pictures,  p => {
		return p.reference_id + "_" + p.bench_root_id
	})

	await Promise.mapSeries(pictures, async (picture) => {
		const pictures = await listPictures({ bench_root_id: picture.bench_root_id, reference_id: picture.reference_id })
		
		const picturesLive = _.filter(pictures, pic => pic.bench_id === picture.bench_root_id)
		const picturesValidation = _.filter(pictures, pic => pic.benchsteptype === 40 && pic.picturestatus >= 50)
		const livePriority = _.filter(picturesLive, p => p.view_type_code == '1' || p.view_type_code == '13')
		const validationPriority = _.filter(picturesValidation, p => p.view_type_code == '1' || p.view_type_code == '13')

		const isFull = _.size(picturesLive) == _.size(picturesValidation)
		const priorityIsFull = _.size(livePriority) == _.size(validationPriority)

		console.log("isFull", isFull)
		console.log("priorityIsFull", priorityIsFull)

		if (isFull) {
			const needToBroadcast = !!_.find(picturesValidation, p => p.picturestatus == 50)
			if (needToBroadcast) {
				picturesToDownload = picturesToDownload.concat(picturesValidation)
			}
			picturesToDownload = needToBroadcast ? picturesToDownload.concat(picturesValidation) : []
		} else if (priorityIsFull) {
			const needToBroadcast = !!_.find(validationPriority, p => p.picturestatus == 50)
			if (needToBroadcast) {
				picturesToDownload = picturesToDownload.concat(validationPriority)
			}
		}
	})

	await Promise.mapSeries(picturesToDownload, async (picture) => {
		try {
			await downloadPicture(picture)
			await setDownloadOk(picture)
		} catch (err) {
			console.error(err)
		}
	})

	const pictureToRefuse = _.first(picturesToDownload)
	if (pictureToRefuse) {
		await refusePicture(pictureToRefuse, "Please remove the background")
	}
}

start()