import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import {
  Expand,
  Fold,
  List,
  Lock,
  Monitor,
  Odometer,
  Setting,
  User,
  UserFilled,
  View,
} from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { setupPermissionDirective } from './directives/permission'
import router from './router'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
app.component('Expand', Expand)
app.component('Fold', Fold)
app.component('List', List)
app.component('Lock', Lock)
app.component('Monitor', Monitor)
app.component('Odometer', Odometer)
app.component('Setting', Setting)
app.component('User', User)
app.component('UserFilled', UserFilled)
app.component('View', View)
setupPermissionDirective(app)
app.use(router)
app.mount('#app')
