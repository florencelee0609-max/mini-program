Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' }
  },
  methods: {
    onClose: function () {
      this.triggerEvent('close')
    },
    noop: function () {}
  }
})
