function parseInputObj(map_iterable) {
  let str = ''
  for (let input of map_iterable) {
    str += input.name + '=' + input.value + '&'
  }
  return str.slice(0, -1)
}

Vue.component('form-title', {
  template: `
    <div class='form-title form-el'>
      <h1><slot></slot></h1>
    </div>
  `,
})

Vue.component('alert', {
  template: `
    <span class='alert'><slot></slot></span>
  `,
})

Vue.component('card-form', {
  props: ['act'],
  data() {
    return {
      map: new Map(),
      httpSent: false,
      inputName: undefined,
      error: undefined,
    }
  },
  template: `
    <div class='card-form'>
      <div class='card round'>
        <slot></slot>
      </div>
    </div>
  `,
})

Vue.component('form-button', {
  template: `
    <div class='form-button form-el'>
      <button class='round' @click='analise'>
        <i v-if='$parent.httpSent' class='fa fa-sync fa-spin'></i>
        <template v-else>
          <slot></slot>
        </template>
      </button>
    </div>
  `,
  methods: {
    analise() {
      let map = this.$parent.map
      let noClientErrors = true
      let passwordValue
      let confirmValue
      let foundFirstPassword
      for (let input of map.values()) {
        if (input.isPassword && !foundFirstPassword) {
          passwordValue = input.value
          foundFirstPassword = true
        }
        else if (input.isPassword) {
          confirmValue = input.value
        }
        if (input.hasError) {
          noClientErrors = false
          break
        }
      }
      if (confirmValue !== undefined && passwordValue !== confirmValue) {
        noClientErrors = false
        this.$parent.inputName = 'confirm'
        this.$parent.error = 'Passwords not matching.'
      }
      if (noClientErrors) {
        if (typeof this.$parent.act === 'string') {
          this.$parent.httpSent = true
          POSTrequestData(this.$parent.act, parseInputObj(map.values()), (dt) => {
            let data = JSON.parse(dt)
            if (!dt.error) {
              // REDIRECT THIS SHIT BRUH
            } else {
              this.$parent.inputName = dt.inputName
              this.$parent.error = dt.error
            }
            this.$parent.httpSent = false
          })
        } else this.$parent.act(map.values())
      }
    },
  },
})

Vue.component('form-input', {
  props: {
    max: Number,
    placeholder: String,
    name: String,
    type: String,
  },
  data() {
    return {
      val: '',
      empty: undefined,
      error: undefined,
      errorType: undefined,
      showing: true,
      isPassword: undefined,
    }
  },
  mounted() {
    if (this.type === 'password') this.showing = false
    else this.showing = true
    this.isPassword = !this.showing
    let obj = { 
      hasError: true,
      value: '',
      isPassword: this.isPassword,
      name: this.name,
    }
    this.$parent.map.set(this.name, obj)
  },
  template: `
    <div class='form-input form-el'>
      <div>
        <input v-model='val' :class='{ input: true, round: true, "wrong-input": error || $parent.inputName === name}' autocomplete='off' :type='inputType' :placeholder='placeholder' :name='name' />
        <alert v-if='error && errorType === "empty"'>
          This field cannot be empty.
        </alert>
        <alert v-if='error && errorType === "max"'>
          The field has to be less than {{ max + 1 }} characters.
        </alert>
        <alert v-if='$parent.inputName === name'>
          {{ $parent.error }}
        </alert>
        <template v-if='type === "password"'>
          <i v-if='showing' @click='showing = false' class='fa fa-eye tine-icon'></i>
          <i v-if='!showing' @click='showing = true' class='fa fa-eye-slash tine-icon'></i>
        </template>
      </div>
    </div>
  `,
  computed: {
    inputType() {
      if (this.showing) return "text"
      else return "password"
    },
  },
  watch: {
    val() {
      if (this.$parent.inputName === this.name) {
        this.$parent.inputName = undefined
        this.$parent.error = undefined
      }
      let obj = { 
        hasError: true,
        value: this.val.trim(),
        isPassword: this.isPassword,
        name: this.name,
      }
      if (this.val.trim() === '') {
        this.error = true
        this.errorType = 'empty'
      } else if (this.val.trim().length > this.max) {
        this.error = true
        this.errorType = 'max'
      }
      else {
        obj.hasError = false
        this.error = false
      }
      this.$parent.map.set(this.name, obj)
    },
  },
})
