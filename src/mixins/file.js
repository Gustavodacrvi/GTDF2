
import { mapState } from "vuex"

import fire, { storage } from 'firebase/app'
import 'firebase/storage'

export default {
  methods: {
    getFileStatus(fileName) {
      if (this.addedFiles.find(el => el.name === fileName))
        return 'update'
      if (this.defaultTask && this.defaultTask.files && this.defaultTask.files.includes(fileName) && !this.task.files.includes(fileName))
        return 'remove'
      return ''
    },
    addFile(file) {
      if (!this.task.files.includes(file.name))
        this.task.files.push(file.name)
      if (!this.addedFiles.find(el => el.name === file.name))
        this.addedFiles.push(file)
    },
    deleteFile(fileName) {
      const i = this.task.files.findIndex(el => el === fileName)
      const found = i > -1
      if (found)
        this.task.files.splice(i, 1)
      if (found && this.addedFiles.find(f => f.name === fileName)) {
        const j = this.addedFiles.findIndex(f => f.name === fileName)
        this.addedFiles.splice(j, 1)
      }
    },
    viewFile(fileName, storageFolder, parentId) {
      storage().ref(`attachments/${this.user.uid}/${storageFolder}/${parentId}/${fileName}`).getDownloadURL().then(url => {
        this.$store.commit('readFile', url)
      }).catch(err => {
        this.$store.commit('pushToast', {
          name: this.l["An error occurred while downloading file"],
          seconds: 4,
          type: 'error',
        })
      })
    },
    downloadFile(fileName, storageFolder, parentId) {
      storage().ref(`attachments/${this.user.uid}/${storageFolder}/${parentId}/${fileName}`).getDownloadURL().then(url => {
        utils.downloadBlobFromURL(url).then(blob => {
          url = window.URL.createObjectURL(blob)
          let element = document.createElement('a')
          element.setAttribute('href', url)
          element.setAttribute('download', fileName)
        
          element.style.display = 'none'
          document.body.appendChild(element)
        
          element.click()
        
          document.body.removeChild(element)
        })
      }).catch(err => {
        this.$store.commit('pushToast', {
          name: this.l["An error occurred while downloading file"],
          seconds: 4,
          type: 'error',
        })
      })
    },
    saveFiles(toRemoveFiles, toAddFiles, parentId, storageFolder) {
      const rem = toRemoveFiles.slice()
      const add = toAddFiles.slice()
      for (const r of rem) {
        if (add.find(el => el.name === r)) {
          const i = rem.findIndex(f => f === r)
          rem.splice(i, 1)
        }
      }

      let totalBytes = 0
      this.uploadProgress = 0
      add.forEach(file => totalBytes += file.size)
      const store = fire.storage()

      const fileProgress = {}

      const calcProgress = () => {
        let totalTransferred = 0
        const values = Object.values(fileProgress)
        values.forEach(v => totalTransferred += v)
        this.uploadProgress = (totalTransferred / totalBytes) * 100
      }

      const taskPath = `attachments/${this.user.uid}/${storageFolder}/${parentId}/`
      const addFiles = () => {
        const proms = []
        for (const f of add) {
          proms.push(new Promise((solve, reject) => {
            const ref = store.ref(taskPath + f.name)
            const upload = ref.put(f)
            upload.on('state_changed', snap => {
              fileProgress[f.name] = snap.bytesTransferred
              calcProgress()
            })
            upload.then(solve)
          }))
        }
        return Promise.all(proms)
      }
      const removeFiles = () => {
        const proms = []
        for (const r of rem) {
          proms.push(new Promise((solve, reject) => {
            const ref = store.ref(taskPath + r) 
            ref.delete().then(solve)
          }))
        }
        return Promise.all(proms)
      }
      return new Promise((solve, reject) => {
        Promise.all([
          addFiles(),
          removeFiles(),
        ]).then(() => {
          solve()
          this.task.addedFiles = []
          this.task.files = []
          this.savingTask = false
          this.uploadProgress = null
          if (this.defaultTask)
            this.$emit('cancel')
        }).catch(reject)
      })
    },
  },
  computed: {
    ...mapState(['user']),
    isEditingFiles() {
      return this.getFilesToRemove.length > 0 ||
        this.addedFiles.length > 0
    },
    getFiles() {
      let files
      if (this.defaultTask && this.defaultTask.files)
        files = [...this.defaultTask.files.filter(el => {
          return !this.task.files.includes(el)
        }), ...this.task.files]
      else files = this.task.files.slice()
      files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      return files
    },
    getFilesToRemove() {
      // check if removed file is being updated with a new file on the addedFiles
      if (this.defaultTask && this.defaultTask.files)
        return this.defaultTask.files.filter(f =>
          !this.task.files.includes(f) &&
          !this.addedFiles.find(added => added.name === f))
      return []
    },
  }
}