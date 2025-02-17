# Вещи, которые вам нужно знать перед установкой

- Это альфа версия, которая находится в активной разработке. Из версии в версию что-то может меняться.
- Основной функционал работает, но побочные штуки сейчас могут сбоить.
- При обновлении **обязатально** сбрасывайте кэш LuCI.
- Также при обновлении всегда заходите в конфигурацию и проверяйте свои настройки. Конфигурация может измениться.
- Необходимо минимум 15МБ свободного места на роутере. Роутерами с флешками на 16МБ сразу мимо.
- При старте программы редактируется конфиг Dnsmasq.
- Podkop редактирует конфиг sing-box. Обязательно сохраните ваш конфиг sing-box перед установкой, если он вам нужен.
- Информация здесь может быть устаревшей. Все изменения фиксируются в телеграм-чате https://t.me/itdogchat - топик **Podkop**.
- Если у вас не что-то не работает, то следуюет сходить в телеграм чат, прочитать закрепы и выполнить что там написано..
- Если у вас установлен Getdomains, его следует удалить.

# Удаление GetDomains скриптом
```
sh <(wget -O - https://raw.githubusercontent.com/itdoginfo/domain-routing-openwrt/refs/heads/master/getdomains-uninstall.sh)
```

Оставляет туннели, зоны, forwarding. А также stubby и dnscrypt. Они не помешают. Конфиг sing-box будет перезаписан в podkop.

# Установка Podkop
Пакет работает на всех архитектурах.
Тестировался на **ванильной** OpenWrt 23.05 и OpenWrt 24.10.
На FriendlyWrt 23.05 присуствуют зависимости от iptables, которые ломают tproxy. Если у вас появляется warning про это в логах, следуйте инструкции по приведённой там ссылке.

Поддержки APK на данный момент нет. APK будет сделан после того как разгребу основное.

## Автоматическая
```
sh <(wget -O - https://raw.githubusercontent.com/itdoginfo/podkop/refs/heads/main/install.sh)
```

Скрипт также предложит выбрать, какой туннель будет использоваться. Для выбранного туннеля будут установлены нужные пакеты, а для Wireguard и AmneziaWG также будет предложена автоматическая настройка - прямо в консоли скрипт запросит данные конфига. Для AmneziaWG можно также выбрать вариант с использованием конфига обычного Wireguard и автоматической обфускацией до AmneziaWG.

Для AmneziaWG скрипт проверяет наличие пакетов под вашу платформу в [стороннем репозитории](https://github.com/Slava-Shchipunov/awg-openwrt/releases), так как в официальном репозитории OpenWRT они отсутствуют, и автоматически их устанавливает.

## Вручную
Сделать `opkg update`, чтоб установились зависимости.
Скачать пакеты `podkop_*.ipk` и `luci-app-podkop_*.ipk` из релиза. `opkg install` сначала первый, потом второй.

# Обновление
Та же самая команда, что для установки. Скрипт обнаружит уже установленный podkop и предложит обновиться.
```
sh <(wget -O - https://raw.githubusercontent.com/itdoginfo/podkop/refs/heads/main/install.sh)
```

# Удаление
```
opkg remove luci-i18n-podkop-ru luci-app-podkop podkop
```

Если был установлен русский язык
```
opkg remove luci-i18n-podkop-ru
```

# Использование
Конфиг: /etc/config/podkop

Luci: Services/podkop

## Режимы

### Proxy
Для VLESS и Shadowsocks. Другие протоколы тоже будут, кидайте в чат примеры строк без чувствительных данных.

В этом режиме просто копируйте строку в **Proxy String** и из неё автоматически настроится sing-box.

### VPN
Здесь у вас должен быть уже настроен WG/OpenVPN/OpenConnect etc, зона Zone и Forwarding не обязательны.

Просто выбрать интерфейс из списка.

## Настройка доменов и подсетей
**Community Lists** - Включить списки комьюнити

**Subnets list enable** - Включить подсети из общего списка, выбрать из предложенных.

**Custom domains enable** - Добавить свои домены

**Custom subnets enable** - Добавить подсети или IP-адреса. Для подсетей задать маску.

# Известные баги
- [x] Не работает proxy при режимах main vpn, second proxy
- [x] Не всегда отрабатывает ucitrack (применение настроек из luci). Не удаётся повторить
- [x] All traffic for IP ломает инет на клиенте. Proxy mode
- [x] Не отрабатывает рестарт, при awg и не применяются изменения при awg
- [x] awg работает не стабильно
- [x] Сеть рестартится при любом раскладе
- [x] Выкл-вкл wg через luci не отрабатывает поднятие маршрута
- [ ] Если eof после последней строки в rt_tables, то скрипт не добавляет перенос строки
- [ ] Парсинг VLESS не отрабатывает, если в SNI два домена. Пример `sni=telegram.org%3Bwww.telegram.org`
- [ ] `service network restart` ломает маршруты при sing-box
- [ ] Совпадение секции с ruleset ломает конфиг sing-box
- [ ] В каких-то случаях плохо отрабатывает localfile
- [ ] exit 1 если в конфиге присуствует
```
        option doh_backup_noresolv '0'
        list doh_backup_server ''
        list doh_backup_server ''
        list doh_server '127.0.0.1#5053'
        list doh_server '127.0.0.1#5054'
```
- [x] Только кастомный remote list не создаёт секцию в route-rules-rule-set и dns-rules-ruleset

# ToDo
Этот раздел не означает задачи, которые нужно брать и делать. Это общий список хотелок. Если вы хотите помочь, пожалуйста, спросите сначала в телеграмме.

Сделано
- [x] Скрипт для автоматической установки.
- [x] Подсети дискорда.
- [x] Удаление getdomains через скрипт. Кроме туннеля и sing-box.
- [x] Дополнительная вкладка для ещё одного туннеля. Домены, подсети.
- [x] Улучшение скрипта автоматической установки. Спрашивать про туннели.
- [x] Зависимость от dnsmasq-full
- [x] Весь трафик для устойства пускать в туннель\прокси
- [x] Исключение для IP, не ходить в туннель\прокси совсем 0x0
- [x] Врубать галочкой yacd в sing-box
- [x] Свои списки. Просто список доменов с переносом строки 
- [x] Свои списки ipv4
- [x] В nft разделить правило tproxy на маркировку и tproxy
- [x] Вернуть две цепочки nft
- [x] Ntp (порт 123) делать маркировку 0x0. По галке
- [x] Открытый прокси порт на роутере для браузеров
- [x] Автонастройка wireguard по примеру getdomains
- [x] Автонастройка awg по примеру getdomains
- [x] RU перевод
- [x] Переделать на PROCD и выкинуть ucitrack.
- [x] Нужен дебаг. Restart ucitrack в отдельный скрипт postinst, не отрабатывает.
- [x] Закомментировать дефолтные значения у list. interface поставить в пустое.
- [x] Скрипт установки: проверка установлен ли уже podkop. Если да, то просто предлагать обновится без установки тунелей и прокси.

Приоритет 1
- [x] Изменить название "Alternative Config"
- [x] "domain_service_enabled" Добавить _second
- [x] Установка Ru пакета в install.sh
- [x] Правка nft mark, tproxy
- [x] Правка перевода минимальная
- [x] Вставлять готовый outdbound вместо строки. Отдельная галка, которая в идеале должны скрывать поле для строки
- [ ] udp over tcp для ss сделать с выбором:
1) отключен (ПО на сервере -Shadowsocks)
2) включен, версия 2 (новые релизы xray-core, sing-box на сервере)
3) включен, версия 1 (старые релизы xray, sing-box на сервере)
Проблема в том, что это нужно только если SS. Выставлять выбор при парсинг из конфига вопрос можно ли. Если совсем тупо - сделать костыль в допонительные настройки
- [x] Проверка места в скрипте install. Если доступно меньше 20MB - exit 1 c выводом колько надо и сколько доступно. + показ модели роутера
- [ ] Правило запрещающее QUIC 
- [ ] Проверить обновление списков, отрабатывает ли
- [ ] Проверка на ванильную openwrt
- [ ] Проверка откуда установлен sing-box. Например, проверять установлен ли он из официального репозитория
- [x] TG в сервисы
- [ ] Выбор ткуда направлять трафик в туннель. В том числе чтоб откуда угодно, а не только br-lan
- [ ] Диагностика: Proxy check completed successfully предположительно не показывает IP, если вернулся это IPv6.
- [ ] Диагностика: podkop_domains: 0 elements как проверять что доходят запросы при fakeip? Мб врубать логи dnsmasq и их чекать.
- [ ] Сделать галку запрещающую подкопу редачить dhcp. Допилить в исключение вместе с пустыми полями proxy и vpn
- [ ] Валидации предустановленных значений. Если прописаны другие, то вывод в лог о неизвестной переменной и продолжение работы
- [ ] Добавление в список доменов домены первого уровня (LuCI)
- [ ] Проверка, что версия в makefile совпадает с тегом

Приоритет 2
- [x] Списки доменов и подсетей с роутера
- [ ] Кнопка обновления списка доменов и подсетей. Запихнуть в главное меню
- [ ] IPv6

Wiki
- [x] Тема
- [x] Изначальное наполнение

Низкий приоритет
- [x] Переменная, раз во сколько часов обновлять списки
- [ ] Галочка, которая режет доступ к doh серверам
- [ ] Свой конфиг sing-box
- [x] Поменять curl на wget, убрать зависимость. Проверять доступность списков лучше всего curl`ом

Рефактор
- [ ] Handle для sing-box
- [ ] Handle для dnsmasq
- [ ] Формирование json для sing-box на уровне jq, а не шаблонов
- [ ] Unit тесты (BATS)
- [ ] Интеграционые тесты бекенда (OpenWrt rootfs + BATS)

Хз как сделать
- [ ] Добавить label от конфига vless\ss\etc в luci.

# Установка версии v0.2.5
Удаляет полностью все пакеты podkop. Удаляет текущую конфигурацию podkop.
После установки **обязательно** сбросьте кэш в LuCI.

```
sh <(wget -O - https://raw.githubusercontent.com/itdoginfo/podkop/refs/heads/main/install-v0.2.5.sh)
```

# Разработка
Есть два варианта:
- Просто поставить пакет на роутер или виртуалку и прям редактировать через SFTP (opkg install openssh-sftp-server)
- SDK, чтоб собирать пакеты

Для сборки пакетов нужен SDK, один из вариантов скачать прям файл и разархивировать
https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/
Нужен файл с SDK в имени

```
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-sdk-23.05.5-x86-64_gcc-12.3.0_musl.Linux-x86_64.tar.xz
tar xf openwrt-sdk-23.05.5-x86-64_gcc-12.3.0_musl.Linux-x86_64.tar.xz
mv openwrt-sdk-23.05.5-x86-64_gcc-12.3.0_musl.Linux-x86_64 SDK
```
Последнее для удобства.

Создаём директорию для пакета
```
mkdir package/utilites
```

Симлинк из репозитория
```
ln -s ~/podkop/podkop package/utilites/podkop
ln -s ~/podkop/luci-app-podkop package/luci-app-podkop
```

В первый раз для сборки luci-app необходимо обновить пакеты
```
./scripts/feeds update -a
```

Для make можно добавить флаг -j N, где N - количество ядер для сборки. Первый раз пройдёт быстрее.

При первом make выводится менюшка, можно просто save, exit и всё. Первый раз долго грузит зависимости.

Сборка пакета. Сами пакеты собираются быстро.
```
make package/podkop/{clean,compile} V=s
```

Также для luci
```
make package/luci-app-podkop/{clean,compile} V=s
```

.ipk лежат в `bin/packages/x86_64/base/`

## Примеры строкs
https://github.com/itdoginfo/podkop/blob/main/String-example.md

## Ошибки
```
Makefile:17: /SDK/feeds/luci/luci.mk: No such file or directory
make[2]: *** No rule to make target '/SDK/feeds/luci/luci.mk'.  Stop.
time: package/luci/luci-app-podkop/clean#0.00#0.00#0.00
    ERROR: package/luci/luci-app-podkop failed to build.
make[1]: *** [package/Makefile:129: package/luci/luci-app-podkop/clean] Error 1
make[1]: Leaving directory '/SDK'
make: *** [/SDK/include/toplevel.mk:226: package/luci-app-podkop/clean] Error 2
```

Не загружены пакеты для luci

## make зависимости
https://openwrt.org/docs/guide-developer/toolchain/install-buildsystem

Ubuntu
```
sudo apt update
sudo apt install build-essential clang flex bison g++ gawk \
gcc-multilib g++-multilib gettext git libncurses-dev libssl-dev \
python3-distutils rsync unzip zlib1g-dev file wget
```
