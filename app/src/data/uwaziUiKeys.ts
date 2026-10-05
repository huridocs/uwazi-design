/** The first 412 keys of Uwazi's System context (`contents/ui-translations/en.csv`
 *  in huridocs/uwazi), with the Spanish, French, Arabic and Korean texts Uwazi
 *  ships for them where they differ from English. Settings › Translations
 *  seeds its "User Interface" context from it (acceptance SD-7), and Korean's
 *  predefined translation (SD-8) is its `ko` column. Generated; do not edit by
 *  hand. */
export interface UwaziUiKey {
  key: string;
  es?: string;
  fr?: string;
  ar?: string;
  ko?: string;
}

export const UWAZI_UI_KEYS: UwaziUiKey[] = [
{
"key": "\"Costa Rica\"",
"ar": "\"كوستاريكا\"",
"ko": "\"인권 침해\""
},
{
"key": "\"the status\"~5",
"es": "\"el estado\"~5",
"fr": "\"le statut\"~5",
"ar": "\"الوضع القانوني\"~5",
"ko": "\"법적 상태\"~5"
},
{
"key": "*please keep this key secret and don't share it.",
"es": "*Por favor, mantén esta clave en secreto y no la compartas.",
"fr": "*Veuillez garder cette clé secrète et ne la communiquez à personne.",
"ar": "*يرجى الحفاظ على سرية هذا الرمز وعدم مشاركته مع أي شخص.",
"ko": "*이 키는 비밀로 유지하시고 다른 사람과 공유하지 마십시오."
},
{
"key": "+ Add data source",
"es": "+ Añadir fuente de datos",
"fr": "+ Ajouter une source de données",
"ar": "+ إضافة مصدر بيانات",
"ko": "+ 데이터 소스 추가"
},
{
"key": "+ Add filter",
"es": "+ Añadir filtro",
"fr": "+ Ajouter un filtre",
"ar": "+ إضافة مرشح",
"ko": "+ 필터 추가"
},
{
"key": "+ click to select multiple cards.",
"es": "+ para seleccionar múltiples tarjetas",
"fr": "+ Cliquez pour sélectionner plusieurs cartes.",
"ar": "+ انقر لتحديد عدة بطاقات.",
"ko": "+ 클릭하여 여러 장의 카드를 선택하세요."
},
{
"key": "198?",
"fr": "198 ?"
},
{
"key": "2FA",
"es": "Autenticación de dos factores (2FA)",
"fr": "Authentification à deux facteurs (2FA)",
"ar": "التوثيق الثنائي (2FA)",
"ko": "2단계 인증"
},
{
"key": "2FA Enabled",
"es": "Autenticación de dos factores activada",
"fr": "Authentification à deux facteurs activée",
"ar": "تم تمكين المصادقة الثنائية (2FA)",
"ko": "2단계 인증 활성화됨"
},
{
"key": "A default template cannot be deleted.",
"es": "No se puede eliminar una plantilla predeterminada.",
"fr": "Un modèle par défaut ne peut pas être supprimé.",
"ar": "لا يمكن حذف القالب الافتراضي.",
"ko": "기본 템플릿은 삭제할 수 없습니다."
},
{
"key": "A friendly hand for serious work — I'll act in the context shown above.",
"es": "Una mano amiga para un trabajo serio: actuaré según el contexto que se muestra más arriba.",
"fr": "Une main amicale pour un travail sérieux — Je vais agir dans le contexte présenté ci-dessus.",
"ar": "يد ودودة لعمل جاد — سأتصرف وفقاً للسياق الموضح أعلاه.",
"ko": "진지한 작업을 위한 친절한 도움 — 위에서 제시된 맥락에 따라 행동하겠습니다."
},
{
"key": "A generated ID will be the default title.",
"es": "El ID autogenerado será el título por defecto",
"fr": "Un identifiant généré sera le titre par défaut.",
"ar": "سيكون معرف تم إنشاؤه العنوان.",
"ko": "생성된 아이디가 기본값으로 설정됩니다."
},
{
"key": "A source template must",
"es": "Una plantilla de origen debe",
"fr": "Un modèle source doit",
"ar": "يجب أن يستوفي القالب المصدر ما يلي:",
"ko": "소스 템플릿은 반드시"
},
{
"key": "A target template needs to have the following properties",
"es": "Una plantilla de destino debe tener las siguientes propiedades",
"fr": "Un modèle cible doit posséder les propriétés suivantes",
"ar": "يجب أن يتضمن القالب المستهدف الخصائص التالية",
"ko": "대상 템플릿에는 다음 속성이 있어야 합니다."
},
{
"key": "A valid email is required",
"es": "La dirección de correo electrónico es obligatorio",
"fr": "L'email est obligatoire",
"ar": "البريد الإلكتروني مطلوب",
"ko": "이메일이 필요합니다."
},
{
"key": "A → Z",
"ar": "أ → ي"
},
{
"key": "Accept",
"es": "Aceptar",
"fr": "Accepter",
"ar": "قبول",
"ko": "수락"
},
{
"key": "Accept all",
"es": "Aceptar todo",
"fr": "Tout accepter",
"ar": "قبول الكل",
"ko": "모두 수락"
},
{
"key": "Accepted suggestion on entity",
"es": "Sugerencia aceptada en la entidad",
"fr": "Suggestion acceptée concernant l'entité",
"ar": "اقتراح مقبول بشأن الكيان",
"ko": "엔티티에 대한 제안이 수락되었습니다."
},
{
"key": "Accepting suggestions",
"es": "Aceptando sugerencias",
"fr": "Acceptation des suggestions en cours",
"ar": "قبول الاقتراحات",
"ko": "제안 접수 중"
},
{
"key": "Accessibility checks need attention",
"es": "Hay que prestar atención a las comprobaciones de accesibilidad",
"fr": "Les contrôles d'accessibilité méritent une attention particulière",
"ar": "تحتاج عمليات التحقق من إمكانية الوصول إلى مزيد من الاهتمام",
"ko": "접근성 점검에 주의를 기울여야 합니다"
},
{
"key": "Account",
"es": "Cuenta",
"fr": "Compte",
"ar": "حساب",
"ko": "계정"
},
{
"key": "Account locked",
"es": "Cuenta bloqueada",
"fr": "Compte verrouillé",
"ar": "الحساب مقفل",
"ko": "계정 잠김"
},
{
"key": "Account unlocked successfully",
"es": "Cuenta desbloqueada satisfactoriamente",
"fr": "Le compte a été déverrouillé avec succès",
"ar": "تم إلغاء قفل الحساب بنجاح",
"ko": "계정이 성공적으로 잠금 해제되었습니다."
},
{
"key": "Account updated",
"es": "Cuenta actualizada",
"fr": "Compte mis à jour",
"ar": "تم تحديث الحساب",
"ko": "계정 정보가 업데이트되었습니다."
},
{
"key": "Accuracy",
"es": "Precisión",
"fr": "Précision",
"ar": "الدقة",
"ko": "정확도"
},
{
"key": "Accuracy tooltip",
"es": "La precisión se define según la cantidad de coincidencias frente a desajustes en las muestras etiquetadas que se han procesado.",
"fr": "La précision est définie par le nombre de correspondances par rapport aux non-correspondances pour les échantillons étiquetés qui ont été traités.",
"ar": "تُعرَّف الدقة بعدد حالات التطابق مقابل حالات عدم التطابق في العينات المصنفة التي تمت معالجتها.",
"ko": "정확도는 처리된 레이블이 지정된 샘플에 대해 일치하는 부분과 일치하지 않는 부분의 비율로 정의됩니다."
},
{
"key": "Action",
"es": "Acción",
"ar": "عمل/ إجراء",
"ko": "활동"
},
{
"key": "Actions",
"es": "Acciones",
"ar": "الإجراءات",
"ko": "작업"
},
{
"key": "Activate",
"es": "Activar",
"fr": "Activer",
"ar": "تفعيل",
"ko": "활성화"
},
{
"key": "Activated",
"es": "Activado",
"fr": "Activé",
"ar": "تم تنشيطه",
"ko": "활성화됨"
},
{
"key": "Active filters",
"es": "Filtros activos",
"fr": "Filtres actifs",
"ar": "المرشحات النشطة",
"ko": "활성 필터"
},
{
"key": "Active languages",
"es": "Idiomas activos",
"fr": "Langues actives",
"ar": "اللغات النشطة",
"ko": "사용 중인 언어"
},
{
"key": "Active primary",
"es": "Primario activo",
"fr": "Primaire active",
"ar": "الملف الأساسي النشط",
"ko": "활성 1차"
},
{
"key": "Activity",
"es": "Actividad",
"fr": "Activité",
"ar": "النشاط",
"ko": "활동"
},
{
"key": "Activity log",
"es": "Registro de actividad",
"fr": "Journal d'activité",
"ar": "سجل النشاطات",
"ko": "활동 로그"
},
{
"key": "Activity Log",
"es": "Registro de Actividad",
"fr": "Journal d'activité",
"ar": "سجل النشاطات",
"ko": "활동 로그"
},
{
"key": "Add",
"es": "Añadir",
"fr": "Ajouter",
"ar": "ضف",
"ko": "추가"
},
{
"key": "Add / remove favorite",
"es": "Añadir / eliminar favorito",
"fr": "Ajouter / supprimer un favori",
"ar": "إضافة/ إزالة المفضلة",
"ko": "즐겨찾기 추가/제거"
},
{
"key": "Add a type below.",
"es": "Añadir un tipo debajo.",
"fr": "Ajoutez un type ci-dessous.",
"ar": "أضف نوعًا أدناه.",
"ko": "아래에 유형을 추가하세요."
},
{
"key": "Add an account to the app by scanning the provided QR code with your mobile device or by inserting the provided key.",
"es": "Añade una cuenta a la aplicación escaneando el código QR que se te ha facilitado con tu dispositivo móvil o introduciendo la clave que se te ha facilitado.",
"fr": "Ajoutez un compte à l'application en scannant le code QR fourni à l'aide de votre appareil mobile ou en saisissant la clé fournie.",
"ar": "أضف حسابًا إلى التطبيق عن طريق مسح رمز الاستجابة السريعة (QR) المرفق باستخدام جهازك المحمول أو عن طريق إدخال المفتاح المرفق.",
"ko": "모바일 기기로 제공된 QR 코드를 스캔하거나 제공된 키를 입력하여 앱에 계정을 추가하세요."
},
{
"key": "Add as",
"es": "Añadir como",
"fr": "Ajouter en tant que",
"ar": "إضافة كـ",
"ko": "다음으로 추가"
},
{
"key": "Add data source",
"es": "Añadir fuente de datos",
"fr": "Ajouter une source de données",
"ar": "إضافة مصدر بيانات",
"ko": "데이터 소스 추가"
},
{
"key": "Add date",
"es": "Añadir fecha",
"fr": "Ajouter une date",
"ar": "إضافة تاريخ",
"ko": "날짜 추가"
},
{
"key": "Add entities / documents",
"es": "Añadir entidades / documentos",
"fr": "Ajouter des entités / documents",
"ar": "إضافة كيانات (أو إدخالات)/ مستندات",
"ko": "엔티티/문서 추가"
},
{
"key": "Add entity",
"es": "Añadir entidad",
"fr": "Ajouter une entité",
"ar": "إضافة كيان",
"ko": "엔티티 추가"
},
{
"key": "Add entity type",
"es": "Añadir tipo de entidad",
"fr": "Ajouter un type d'entité",
"ar": "إضافة نوع الكيان",
"ko": "엔티티 유형 추가"
},
{
"key": "Add Extractor",
"es": "Añadir extractor",
"fr": "Ajouter un extracteur",
"ar": "إضافة أداة استخراج",
"ko": "추출기 추가"
},
{
"key": "Add extractor",
"es": "Añadir extractor",
"fr": "Ajouter un extracteur",
"ar": "إضافة أداة استخراج",
"ko": "추출기 추가"
},
{
"key": "Add file",
"es": "Añadir archivo",
"fr": "Ajouter le fichier",
"ar": "اضف ملف",
"ko": "파일 추가"
},
{
"key": "Add from URL",
"es": "Añadir desde URL",
"fr": "Ajouter à partir d'une url",
"ar": "إضافة من عنوان URL",
"ko": "URL 에서 추가"
},
{
"key": "Add from web",
"es": "Añadir desde la web",
"fr": "Ajouter à partir du web",
"ar": "أضف من الويب",
"ko": "웹에서 추가"
},
{
"key": "Add group",
"es": "Añadir grupo",
"fr": "Ajouter un groupe",
"ar": "إضافة مجموعة",
"ko": "그룹 추가"
},
{
"key": "add icon",
"es": "Añadir ícono",
"fr": "Ajouter une icône",
"ar": "أضف أيقونة",
"ko": "아이콘 추가"
},
{
"key": "Add icon",
"es": "Añadir ícono",
"fr": "Ajouter une icône",
"ar": "إضافة رمز",
"ko": "아이콘 추가"
},
{
"key": "Add item",
"es": "Añadir elemento",
"fr": "Ajouter un élément",
"ar": "إضافة عنصر",
"ko": "항목 추가"
},
{
"key": "Add link",
"es": "Añadir enlace",
"fr": "Ajouter un lien",
"ar": "إضافة رابط",
"ko": "링크 추가"
},
{
"key": "Add or remove relationship types for this collection.",
"es": "Añadir o eliminar tipos de relación para esta colección.",
"fr": "Ajouter ou supprimer des types de relations pour cette collection.",
"ar": "إضافة أنواع العلاقات أو إزالتها من هذه المجموعة.",
"ko": "이 컬렉션에 관계 유형을 추가하거나 제거합니다."
},
{
"key": "Add page",
"es": "Añadir página",
"fr": "Ajouter une page",
"ar": "إضافة صفحة",
"ko": "페이지 추가"
},
{
"key": "Add PDF",
"es": "Añadir PDF",
"fr": "Ajouter un fichier PDF",
"ar": "إضافة ملف PDF",
"ko": "PDF 추가"
},
{
"key": "Add people or groups",
"es": "Añadir personas o grupos",
"fr": "Ajouter des personnes ou des groupes",
"ar": "إضافة أشخاص أو مجموعات",
"ko": "사용자 혹은 그룹 추가"
},
{
"key": "Add property",
"es": "Añadir propiedad",
"fr": "Ajouter une propriété",
"ar": "إضافة خاصية",
"ko": "속성 추가"
},
{
"key": "Add relationship",
"es": "Añadir relación",
"fr": "Ajouter une relation",
"ar": "إضافة علاقة",
"ko": "관계 추가"
},
{
"key": "Add relationship type",
"es": "Añadir tipo de relación",
"fr": "Ajouter un type de relation",
"ar": "إضافة نوع العلاقة",
"ko": "관계 유형 추가"
},
{
"key": "Add template",
"es": "Añadir plantilla",
"fr": "Ajouter un modèle",
"ar": "إضافة قالب",
"ko": "템플릿 추가"
},
{
"key": "Add thesaurus",
"es": "Añadir tesauro",
"fr": "Ajouter un thésaurus",
"ar": "أضف قائمة المفردات",
"ko": "시소러스 추가"
},
{
"key": "Add thesaurus value",
"es": "Añadir valor del tesauro",
"fr": "Ajouter une valeur au thésaurus",
"ar": "إضافة قيمة إلى المكنز",
"ko": "시소러스 값 추가"
},
{
"key": "Add timelink",
"es": "Añadir línea de tiempo",
"fr": "Ajouter un lien temporel",
"ar": "إضافة رابط زمني",
"ko": "타임링크 추가"
},
{
"key": "Add to all languages",
"es": "Añadir a todos los idiomas",
"fr": "Ajouter à toutes les langues",
"ar": "إضافة إلى جميع اللغات",
"ko": "모든 언어에 추가"
},
{
"key": "Add to table of contents",
"es": "Añadir a la tabla de contenidos",
"fr": "Ajouter à la table des matières",
"ar": "أضف إلى جدول المحتويات",
"ko": "목차에 추가"
},
{
"key": "Add to ToC",
"es": "Añadir a TdC",
"fr": "Ajouter à la table des matières",
"ar": "إضافة إلى جدول المحتويات",
"ko": "목차에 추가"
},
{
"key": "Add to training set",
"es": "Añadir a conjunto de entrenamiento",
"fr": "Ajouter à l'ensemble d'apprentissage",
"ar": "إضافة إلى مجموعة التدريب",
"ko": "훈련 데이터 세트에 추가"
},
{
"key": "Add translation",
"es": "Añadir traducción",
"fr": "Ajouter une traduction",
"ar": "إضافة ترجمة",
"ko": "번역 추가"
},
{
"key": "Add user",
"es": "Añadir usuario",
"fr": "Ajouter un utilisateur",
"ar": "إضافة مستخدم",
"ko": "사용자 추가"
},
{
"key": "add value",
"es": "añadir valor",
"fr": "Ajouter une valeur",
"ar": "إضافة قيمة",
"ko": "값 추가"
},
{
"key": "Add value",
"es": "Añadir valor"
},
{
"key": "Add/delete users and assign roles",
"es": "Añadir / Eliminar usuarios y asignar roles",
"fr": "Ajouter / Supprimer des utilisateurs et attribuer des rôles",
"ar": "إضافة / حذف المستخدمين وتعيين الأدوار",
"ko": "사용자 추가/삭제 및 권한 부여"
},
{
"key": "Add/edit translations",
"es": "Añadir / editar traducciones",
"fr": "Ajouter / Modifier des traductions",
"ar": "إضافة / تحرير الترجمات",
"ko": "번역 추가/편집"
},
{
"key": "Added at the end of the thesaurus.",
"es": "Añadido al final del tesauro."
},
{
"key": "Added in",
"es": "Añadido en"
},
{
"key": "Added language",
"es": "Idioma añadido",
"fr": "Langue ajoutée",
"ar": "لغة مضافة",
"ko": "언어 추가"
},
{
"key": "Added new user",
"es": "Nuevo usuario añadido",
"fr": "Ajout d'un nouvel utilisateur",
"ar": "تمت إضافة مستخدم جديد",
"ko": "새 사용자 추가됨"
},
{
"key": "Added relation type \"{name}\"",
"es": "Tipo de relación \"{name}\" añadido",
"fr": "Ajout du type de relation \"{name}\"",
"ar": "تمت إضافة نوع العلاقة \"{name}\"",
"ko": "관계 유형 \"{name}\"을 추가했습니다."
},
{
"key": "added to hub with the following errors:",
"es": "añadido al nodo con los siguientes errores:",
"fr": "Ajouté au hub avec les erreurs suivantes :",
"ar": "تمت إضافته إلى المركز مع الأخطاء التالية:",
"ko": "다음 오류와 함께 허브에 추가되었습니다:"
},
{
"key": "added to hub.",
"es": "añadido al nodo.",
"fr": "ajouté au hub.",
"ar": "أُضيفت إلى المركز.",
"ko": "허브에 추가되었습니다."
},
{
"key": "Adding a group and its items.",
"es": "Añadir un grupo y sus elementos.",
"fr": "Ajouter un groupe et ses éléments.",
"ar": "إضافة مجموعة وعناصرها.",
"ko": "그룹과 해당 항목을 추가하기."
},
{
"key": "Adding items to the thesauri",
"es": "Añadir elementos a los tesauros",
"fr": "Ajouter des éléments aux thésaurus",
"ar": "إضافة عناصر إلى المكنز",
"ko": "시소러스에 항목 추가하기"
},
{
"key": "Adjust a few colors; secondary text and muted backgrounds update automatically.",
"es": "Ajusta algunos colores; el texto secundario y los fondos en tonos apagados se actualizan automáticamente.",
"fr": "Modifiez quelques couleurs : le texte secondaire et les arrière-plans aux teintes douces s'adaptent automatiquement.",
"ar": "قم بتعديل بعض الألوان؛ وسيتم تحديث النص الثانوي والخلفيات ذات الألوان الهادئة تلقائيًا.",
"ko": "색상을 몇 가지 조정하면, 보조 텍스트와 은은한 배경이 자동으로 업데이트됩니다."
},
{
"key": "Admin",
"es": "Administración",
"fr": "Administrateur",
"ar": "مشرف",
"ko": "관리자"
},
{
"key": "Administrators and Editors",
"es": "Administradores y Editores.",
"fr": "Administrateurs et éditeurs",
"ar": "المشرفون (أو المسؤولون) والمحررون",
"ko": "관리자 및 편집자"
},
{
"key": "Administrators and Editors always have edit access",
"es": "Los administradores y los editores siempre tienen acceso de edición",
"fr": "Les administrateurs et les rédacteurs disposent toujours d'un accès en modification",
"ar": "يتمتع المسؤولون والمحررون دائمًا بحق الوصول للتحرير",
"ko": "관리자와 편집자는 항상 편집 권한을 가집니다."
},
{
"key": "Admins",
"es": "Administradores",
"fr": "Administrateurs",
"ar": "المسؤولون",
"ko": "관리자"
},
{
"key": "Advanced colors",
"es": "Colores avanzados",
"fr": "Couleurs avancées",
"ar": "ألوان متقدمة",
"ko": "고급 색상"
},
{
"key": "Advanced ECharts overrides",
"es": "Anulaciones avanzadas de ECharts",
"fr": "Remplacements avancés dans ECharts",
"ar": "تجاوزات ECharts المتقدمة",
"ko": "고급 ECharts 재정의"
},
{
"key": "ALL",
"es": "TODOS",
"fr": "TOUT",
"ar": "الكل",
"ko": "전체 필터"
},
{
"key": "All",
"es": "TODOS",
"fr": "Tout",
"ar": "الكل",
"ko": "전체 필터"
},
{
"key": "All changes will be lost, are you sure you want to proceed?",
"es": "Se perderán todos los cambios, ¿estás seguro de que quieres continuar?",
"fr": "Tous les changements seront perdus, êtes-vous sûr de vouloir continuer ?",
"ar": "ستحذف جميع التغييرات، هل أنت متأكد أنك تريد المتابعة؟",
"ko": "모든 변경 사항이 손실됩니다. 계속 진행하시겠습니까?"
},
{
"key": "All data",
"es": "Todos los datos",
"fr": "Tous les données",
"ar": "جميع البيانات",
"ko": "모든 데이터"
},
{
"key": "All editing options will be disabled.",
"es": "Se desactivarán todas las opciones de edición.",
"fr": "Toutes les options d'édition seront désactivées.",
"ar": "سيتم تعطيل جميع خيارات التحرير.",
"ko": "모든 편집 옵션이 비활성화됩니다."
},
{
"key": "All of the paragraphs will be deleted",
"es": "Se eliminarán todos los párrafos",
"fr": "Tous les paragraphes seront supprimés",
"ar": "سيتم حذف جميع الفقرات",
"ko": "모든 단락이 삭제될 것입니다"
},
{
"key": "All of the previously created paragraphs will be deleted and recreated after the process.",
"es": "Todos los párrafos creados anteriormente se eliminarán y se volverán a crear una vez finalizado el proceso.",
"fr": "Tous les paragraphes créés précédemment seront supprimés puis recréés à l'issue du processus.",
"ar": "سيتم حذف جميع الفقرات التي تم إنشاؤها سابقًا وإعادة إنشائها بعد انتهاء العملية.",
"ko": "이 작업이 완료되면 이전에 생성된 모든 단락이 삭제된 후 다시 생성됩니다."
},
{
"key": "Allow captcha bypass",
"es": "Permitir la omisión de captcha",
"fr": "Autoriser le contournement du captcha",
"ar": "السماح بتجاوز اختبار كابتشا",
"ko": "캡차 우회 허용"
},
{
"key": "Allow public embedding without login",
"es": "Permitir la incrustación pública sin necesidad de iniciar sesión",
"fr": "Autoriser l'intégration publique sans connexion",
"ar": "السماح بالتضمين العام دون تسجيل الدخول",
"ko": "로그인 없이 공개 임베딩 허용"
},
{
"key": "Already exists",
"es": "Ya existe",
"fr": "Existe déjà",
"ar": "موجود بالفعل",
"ko": "이미 존재합니다"
},
{
"key": "already exists. Save selects it.",
"es": "ya existe. Guardar lo selecciona."
},
{
"key": "Already the same value.",
"es": "Ya es el mismo valor.",
"fr": "Déjà la même valeur.",
"ar": "القيمة نفسها بالفعل.",
"ko": "이미 동일한 값입니다."
},
{
"key": "Amount",
"es": "Cantidad",
"fr": "Montant",
"ar": "العدد",
"ko": "수량"
},
{
"key": "An admin needs to add relationship types before you can create a relationship.",
"es": "Un administrador necesita añadir tipos de relación para poder crear una relación.",
"fr": "Un administrateur doit d'abord ajouter des types de relations avant que vous puissiez créer une relation.",
"ar": "يجب على المسؤول إضافة أنواع العلاقات قبل أن تتمكن من إنشاء علاقة.",
"ko": "관계를 생성하려면 관리자가 먼저 관계 유형을 추가해야 합니다."
},
{
"key": "An error has occured while deleting a language:",
"es": "Se ha producido un error al eliminar un idioma:",
"fr": "Une erreur s'est produite lors de la suppression d'une langue :",
"ar": "حدث خطأ أثناء حذف إحدى اللغات:",
"ko": "언어를 삭제하는 과정에서 오류가 발생했습니다:"
},
{
"key": "An error has occured while installing languages:",
"es": "Se ha producido un error al instalar los idiomas:",
"fr": "Une erreur s'est produite lors de l'installation des langues :",
"ar": "حدث خطأ أثناء تثبيت اللغات:",
"ko": "언어 설치 중에 오류가 발생했습니다:"
},
{
"key": "An error has occurred",
"es": "Ocurrió un error",
"fr": "Une erreur s'est produite",
"ar": "حدث خطأ",
"ko": "오류가 발생했습니다."
},
{
"key": "An error has occurred during data export",
"es": "Se ha producido un error durante la exportación de datos.",
"fr": "Une erreur s'est produite lors de l'exportation des données",
"ar": "حدث خطأ أثناء تصدير البيانات",
"ko": "데이터 내보내기 중에 오류가 발생했습니다."
},
{
"key": "An error has occurred while installing languages:",
"es": "Se ha producido un error al instalar los idiomas:",
"fr": "Une erreur s'est produite lors de l'installation des langues :",
"ar": "حدث خطأ أثناء تثبيت اللغات:",
"ko": "언어 설치 중에 오류가 발생했습니다:"
},
{
"key": "An error has occurred while uninstalling a language:",
"es": "Se ha producido un error al desinstalar un idioma:",
"fr": "Une erreur s'est produite lors de la désinstallation d'une langue :",
"ar": "حدث خطأ أثناء إلغاء تثبيت إحدى اللغات:",
"ko": "언어를 제거하는 과정에서 오류가 발생했습니다:"
},
{
"key": "An error occurred",
"es": "Se ha producido un error",
"fr": "Une erreur s'est produite",
"ar": "حدث خطأ",
"ko": "오류가 발생했습니다."
},
{
"key": "Analytics",
"es": "Análisis",
"fr": "Analyse de données",
"ar": "التحليلات",
"ko": "분석"
},
{
"key": "Analytics description",
"es": "Si quieres dar seguimiento a las analíticas relacionadas con las visitas a tu colección, Uwazi soporta analíticas tanto de Google como de Matomo",
"fr": "Si vous souhaitez suivre les statistiques de visites de votre collection, Uwazi prend en charge Google Analytics et Matomo.",
"ar": "إذا كنت ترغب في تتبع الإحصاءات المتعلقة بزيارات مجموعتك، فإن Uwazi يدعم كل من Google Analytics وMatomo.",
"ko": "컬렉션 방문과 관련된 분석 데이터를 추적하고 싶다면, Uwazi는 Google Analytics와 Matomo를 모두 지원합니다."
},
{
"key": "AND OR NOT",
"fr": "ET OU NON"
},
{
"key": "Any",
"es": "Cualquiera",
"fr": "Peu importe",
"ar": "أي",
"ko": "전체"
},
{
"key": "Any entity",
"es": "Cualquier entidad",
"fr": "Toute entité",
"ar": "أي كيان",
"ko": "모든 엔티티"
},
{
"key": "any single character",
"es": "cualquier carácter individual",
"fr": "n'importe quel caractère",
"ar": "أي حرف واحد",
"ko": "어떤 한 글자라도"
},
{
"key": "Any type",
"es": "Cualquier tipo",
"fr": "Tout type",
"ar": "أي نوع",
"ko": "모든 유형"
},
{
"key": "Anyone can see this entity",
"es": "Cualquiera puede ver esta entidad",
"fr": "Tout le monde peut voir cette entité",
"ar": "يمكن لأي شخص رؤية هذا الكيان",
"ko": "누구나 이 개체를 볼 수 있습니다"
},
{
"key": "Appearance",
"es": "Aparición",
"fr": "Apparition",
"ar": "الظهور",
"ko": "등장 순서"
},
{
"key": "Apply",
"es": "Aplicar",
"fr": "Appliquer",
"ar": "تطبيق",
"ko": "적용"
},
{
"key": "Are you sure you want to continue?",
"es": "Estás seguro que quieres continuar?",
"fr": "Êtes-vous sûr de vouloir continuer ?",
"ar": "هل أنت متأكد من أنك تريد المتابعة؟",
"ko": "정말 계속하시겠습니까?"
},
{
"key": "Are you sure you want to delete",
"es": "Estás seguro que quieres eliminar",
"fr": "Êtes-vous sûr de vouloir supprimer",
"ar": "هل أنت متأكد من أنك تريد حذف",
"ko": "정말 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete the selected visualizations? This action cannot be\n              undone.",
"es": "¿Estás seguro de que quieres eliminar las visualizaciones seleccionadas? Esta acción no se puede\ndeshacer.",
"fr": "Êtes-vous sûr de vouloir supprimer les visualisations sélectionnées ? Cette action ne peut pas être\nannulée.",
"ar": "هل أنت متأكد من رغبتك في حذف العروض المرئية المحددة؟ لا يمكن\n التراجع عن هذا الإجراء.",
"ko": "선택한 시각화 항목을 정말 삭제하시겠습니까? 이 작업은\n되돌릴 수 없습니다."
},
{
"key": "Are you sure you want to delete this attachment?",
"es": "Estás seguro que quieres eliminar este archivo adjunto?",
"fr": "Êtes-vous sûr de vouloir supprimer cette pièce jointe ?",
"ar": "هل أنت متأكد من رغبتك في حذف هذا المرفق؟",
"ko": "이 첨부 파일을 정말로 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete this connection?",
"es": "Estás seguro que quieres eliminar esta relación?",
"fr": "Êtes-vous sûr de vouloir supprimer cette connexion ?",
"ar": "هل أنت متأكد من رغبتك في حذف هذا الاتصال؟",
"ko": "이 연결을 정말로 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete this entity?",
"es": "Estás seguro que quieres eliminar esta entidad?",
"fr": "Êtes-vous sûr de vouloir supprimer cette entité ?",
"ar": "هل أنت متأكد من أنك تريد حذف هذا الكيان؟",
"ko": "이 엔티티를 정말로 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete this file?",
"es": "Estás seguro que quieres eliminar este archivo?",
"fr": "Êtes-vous sûr de vouloir supprimer ce fichier ?",
"ar": "هل أنت متأكد من رغبتك في حذف هذا الملف؟",
"ko": "이 파일을 정말로 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete this item?",
"es": "Estás seguro que quieres eliminar este elemento?",
"fr": "Êtes-vous sûr de vouloir supprimer cet élément ?",
"ar": "هل أنت متأكد من أنك تريد حذف هذا العنصر؟",
"ko": "이 항목을 정말로 삭제하시겠습니까?"
},
{
"key": "Are you sure you want to delete this relationship? This action cannot be undone.",
"es": "Estás seguro que quieres eliminar esta relación? Esta acción no puede revertirse.",
"fr": "Êtes-vous sûr de vouloir supprimer cette relation ? Cette action ne peut pas être annulée.",
"ar": "هل أنت متأكد من رغبتك في حذف هذه العلاقة؟ لا يمكن التراجع عن هذا الإجراء.",
"ko": "이 관계를 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
},
{
"key": "Are you sure you want to delete this visualization? This action cannot be undone.",
"es": "¿Estás seguro de que quieres eliminar esta visualización? Esta acción no se puede deshacer.",
"fr": "Êtes-vous sûr de vouloir supprimer cette visualisation ? Cette action ne peut pas être annulée.",
"ar": "هل أنت متأكد من رغبتك في حذف هذا العرض المرئي؟ لا يمكن التراجع عن هذا الإجراء.",
"ko": "이 시각화를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
},
{
"key": "Are you sure?",
"es": "Estás seguro?",
"fr": "Êtes-vous sûr ?",
"ar": "هل أنت متأكد؟",
"ko": "확실하십니까?"
},
{
"key": "Ask Bert",
"es": "Pregúntale a Bert",
"fr": "Demander à Bert",
"ar": "اسأل Bert",
"ko": "버트에게 물어보세요"
},
{
"key": "Attachment",
"es": "Archivo",
"fr": "Pièce jointe",
"ar": "المرفق",
"ko": "첨부 파일"
},
{
"key": "Attachment deleted",
"es": "Archivo adjunto eliminado",
"fr": "Pièce jointe supprimée",
"ar": "تم حذف المرفق",
"ko": "첨부 파일 삭제됨"
},
{
"key": "Attachment renamed",
"es": "Archivo adjunto renombrado",
"fr": "Pièce jointe renommée",
"ar": "تم تغيير اسم المرفق",
"ko": "첨부 파일 이름 변경"
},
{
"key": "Attachment uploaded",
"es": "Archivo adjunto subido",
"fr": "Pièce jointe téléchargée",
"ar": "تم تحميل المرفق",
"ko": "첨부 파일 업로드됨"
},
{
"key": "Attachments",
"es": "Archivos adjuntos",
"fr": "Pièces Jointes",
"ar": "المرفقات",
"ko": "첨부 파일"
},
{
"key": "Authentication code",
"es": "Código de autenticación",
"fr": "Code d'authentification",
"ar": "رمز المصادقة",
"ko": "인증 코드"
},
{
"key": "Auto"
},
{
"key": "auto created",
"es": "creado automáticamente",
"fr": "créé automatiquement",
"ar": "تم إنشاؤه تلقائيًا",
"ko": "자동 생성됨"
},
{
"key": "Auto-accept suggestions",
"es": "Aceptar automáticamente las sugerencias",
"fr": "Accepter automatiquement les suggestions",
"ar": "القبول التلقائي للاقتراحات",
"ko": "제안 사항 자동 수락"
},
{
"key": "auto-created",
"es": "autogenerado",
"fr": "créé automatiquement",
"ar": "منشأ تلقائياً",
"ko": "자동 생성 완료"
},
{
"key": "Auto-translate",
"es": "Traducción-automática"
},
{
"key": "Automatic Table of Contents",
"es": "Tabla de contenidos automática.",
"fr": "Table des matières automatique",
"ar": "جدول محتويات تلقائي",
"ko": "자동 생성 목차"
},
{
"key": "Automatically generated",
"es": "Se genera automáticamente",
"fr": "Généré automatiquement",
"ar": "منشأ تلقائياً",
"ko": "자동 생성됨"
},
{
"key": "Available default translation",
"es": "Traducción predeterminada disponible",
"fr": "Traduction par défaut disponible",
"ar": "الترجمة الافتراضية المتاحة",
"ko": "사용 가능한 기본 번역"
},
{
"key": "Back",
"es": "Volver",
"fr": "Retour",
"ar": "عودة",
"ko": "뒤로"
},
{
"key": "Back to",
"es": "Volver a",
"fr": "Retour à",
"ar": "العودة إلى",
"ko": "이전으로"
},
{
"key": "Back to details",
"es": "Volver a los detalles",
"fr": "Retour aux détails",
"ar": "العودة إلى التفاصيل",
"ko": "상세 정보로 돌아가기"
},
{
"key": "Back to search",
"es": "Volver a la búsqueda",
"fr": "Retour à la recherche",
"ar": "العودة إلى البحث",
"ko": "검색으로"
},
{
"key": "Bad Request",
"es": "Petición incorrecta",
"fr": "Erreur de requête",
"ar": "طلب غير صحيح",
"ko": "잘못된 요청"
},
{
"key": "Basic",
"es": "Básico",
"fr": "Notions de base",
"ar": "أساسي",
"ko": "기본"
},
{
"key": "Bert"
},
{
"key": "Bidirectional",
"es": "Bidireccional",
"fr": "Bidirectionnel",
"ar": "ثنائي الاتجاه",
"ko": "양방향"
},
{
"key": "Body",
"es": "Cuerpo",
"fr": "Corps",
"ar": "يجب الاطلاع على السياق لتحديد الترجمة الأنسب",
"ko": "바디"
},
{
"key": "boolean",
"es": "booleano",
"fr": "booléen",
"ar": "منطقية",
"ko": "부울"
},
{
"key": "Browse files to upload",
"es": "Explorar archivos para subir",
"fr": "Parcourir les fichiers à télécharger",
"ar": "تصفح الملفات المراد تحميلها",
"ko": "업로드할 파일 탐색"
},
{
"key": "by ids, methods, keywords, etc.",
"es": "por ids, métodos, palabras clave, etc.",
"fr": "par identifiants, méthodes, mots-clés, etc.",
"ar": "حسب معرّفات الهوية (IDs) والطرق والكلمات المفتاحية، وما إلى ذلك.",
"ko": "ID, 메서드, 키워드 등을 기준으로"
},
{
"key": "By logging in you accept the essential session cookie required to stay signed in.",
"es": "Al iniciar sesión, aceptas la cookie de sesión imprescindible necesaria para mantenerte conectado.",
"fr": "En vous connectant, vous acceptez le cookie de session indispensable pour rester connecté.",
"ar": "بمجرد تسجيل الدخول، فإنك توافق على ملف تعريف الارتباط الضروري للجلسة والمطلوب للحفاظ على حالة تسجيل الدخول.",
"ko": "로그인하면 로그인 상태를 유지하는 데 필요한 필수 세션 쿠키에 동의하게 됩니다."
},
{
"key": "Can edit",
"es": "Puede editar",
"fr": "Peut éditer",
"ar": "إمكانية التحرير",
"ko": "편집 가능"
},
{
"key": "Can see",
"es": "Puede visualizar",
"fr": "Peut voir",
"ar": "إمكانية الرؤية",
"ko": "열람 가능"
},
{
"key": "Can view",
"es": "Puede visualizar",
"fr": "Peut voir",
"ar": "إمكانية المعاينة",
"ko": "열람 가능"
},
{
"key": "Cancel",
"es": "Cancelar",
"fr": "Annuler",
"ar": "الغاء",
"ko": "취소"
},
{
"key": "cancel csv import",
"es": "Cancelar el proceso de importación. Esto detendrá la creación de nuevas entidades. Las entidades ya creadas no serán afectadas",
"fr": "Annuler le processus d'importation. Cela arrêtera la création de nouvelles entités. Les entités déjà créées ne seront pas affectées",
"ar": "قم بإلغاء عملية الاستيراد. سيؤدي ذلك إلى إيقاف إنشاء كيانات جديدة. ولن تتأثر الكيانات التي تم إنشاؤها بالفعل",
"ko": "가져오기 과정을 취소하십시오. 이렇게 하면 새로운 엔티티의 생성이 중단됩니다. 이미 생성된 엔티티에는 영향을 미치지 않습니다."
},
{
"key": "Canceling",
"es": "Cancelando",
"fr": "Annulation",
"ar": "الإلغاء",
"ko": "취소"
},
{
"key": "Canceling...",
"es": "Cancelando",
"fr": "Annulation...",
"ar": "جاري الإلغاء...",
"ko": "취소 중..."
},
{
"key": "Cancelled",
"es": "Cancelado",
"fr": "Annulé",
"ar": "تم إلغاؤه",
"ko": "취소됨"
},
{
"key": "Cannot connect to server",
"es": "No se puede conectar con el servidor",
"fr": "Impossible de se connecter au serveur",
"ar": "يتعذر الاتصال بالخادم",
"ko": "서버에 연결할 수 없습니다"
},
{
"key": "Cannot find extractor",
"es": "No se puede encontrar el extractor",
"fr": "Impossible de trouver l'extracteur",
"ar": "تعذر العثور على أداة الاستخراج",
"ko": "추출기를 찾을 수 없습니다"
},
{
"key": "Captcha",
"ar": "حروف التحقق",
"ko": "보안 문자"
},
{
"key": "Captcha bypass",
"es": "Al estar activo, puede permitir que los usuarios envíen sus plantillas incluidas en la lista blanca sin tener que ingresar un CAPTCHA.\nEl formulario aún presentará el captcha a los usuarios finales, pero el endpoint de la API permitirá envíos sin validación de CAPTCHA si se incluye la cabecera \"Bypass-Captcha: true\". Esta opción no es segura y puede ser aprovechada para inundar su instancia con spam o contenido malicioso.",
"fr": "En activant cette option, vous autorisez les utilisateurs à soumettre vos modèles en liste blanche sans avoir à remplir de CAPTCHA. \nLe formulaire continuera d'afficher le captcha aux utilisateurs finaux, mais le point de terminaison de l'API acceptera les soumissions sans validation CAPTCHA si un \nen-tête \"Bypass-Captcha: true\" est envoyé. Cette option n'est pas sécurisée et peut être exploitée pour inonder votre instance de spam ou de \ncontenu malveillant.",
"ar": "بتفعيل هذا الخيار، يمكنك السماح للمستخدمين بالإرسال إلى القوالب المدرجة في القائمة البيضاء دون الحاجة إلى تعبئة رمز التحقق (CAPTCHA).\nسيظل النموذج يعرض رمز التحقق للمستخدمين النهائيين، لكن نقطة نهاية API ستسمح بعمليات الإرسال دون التحقق من CAPTCHA إذا تم إرسال\nترويسة \"Bypass-Captcha: true\" مع الطلب. هذا الخيار غير آمن ويمكن استغلاله لإغراق نسختك من التطبيق برسائل غير مرغوب فيها أو محتوى ضار.",
"ko": "이 옵션을 켜면 사용자가 CAPTCHA를 입력하지 않고도 허용 목록에 등록된 템플릿에 항목을 제출할 수 있습니다. 양식에는 최종 사용자에게 여전히 캡차가 표시되지만, \"Bypass-Captcha: true\" 헤더가 함께 전송되면 API 엔드포인트는 CAPTCHA 검증 없이 제출을 허용합니다. 이 옵션은 안전하지 않으며, 스팸이나 악성 콘텐츠가 인스턴스에 대량으로 유입되도록 악용될 수 있습니다."
},
{
"key": "Cards",
"es": "Tarjetas",
"fr": "Cartes",
"ar": "بطاقات",
"ko": "카드"
},
{
"key": "Cards view",
"es": "Vista de tarjetas",
"fr": "Vue en cartes",
"ar": "معاينة البطاقات",
"ko": "카드 뷰"
},
{
"key": "Category",
"es": "Categoría",
"fr": "Catégorie",
"ar": "الفئة",
"ko": "카테고리"
},
{
"key": "Change",
"es": "Cambiar",
"fr": "Modifier",
"ar": "تغيير",
"ko": "변경"
},
{
"key": "Change Password",
"es": "Cambiar contraseña",
"fr": "Modifier le mot de passe",
"ar": "تغيير كلمة المرور",
"ko": "비밀번호 변경"
},
{
"key": "Changes in the thesaurus will impact all the entities using these values.",
"es": "Los cambios en Tesauros impactarán en todas las entidades que usen esos valores.",
"fr": "Les modifications apportées au thésaurus auront des répercussions sur toutes les entités utilisant ces valeurs.",
"ar": "ستؤثر التغييرات التي تُجرى على المكنز اللغوي على جميع الكيانات التي تستخدم هذه القيم.",
"ko": "시소러스에 변경 사항이 적용되면 해당 값을 사용하는 모든 엔티티에 영향을 미칩니다."
},
{
"key": "Changing the type will erase all relationships to this entity.",
"es": "Cambiar el tipo borrará todas las relaciones de esta entidad.",
"fr": "La modification du type entraînera la suppression de toutes les relations associées à cette entité.",
"ar": "سيؤدي تغيير النوع إلى محو جميع العلاقات المرتبطة بهذا الكيان.",
"ko": "유형을 변경하면 이 엔티티와 관련된 모든 관계가 삭제됩니다."
},
{
"key": "Character support description",
"es": "Esta opción mejora la compatibilidad con idiomas no latinos como idiomas predeterminados de tu colección.\nAl seleccionar esta opción, todas las propiedades de la plantilla se actualizarán automáticamente. El proceso puede tardar varios minutos. Seleccionar esta opción probablemente cambiará las URL de los filtros de la colección. Como consecuencia, si tienes menús o enlaces que usan dichas URL, probablemente dejarán de funcionar.\nDeberás actualizarlos manualmente. Después de seleccionar esta opción, no podrás volver a usar los nombres de la propiedad heredada. Si no tienes problemas con los nombres de las propiedades de tu plantilla, recomendamos no marcar esta opción.",
"fr": "Cette option améliore la prise en charge des langues non latines en tant que langues par défaut de votre collection.\nSi vous sélectionnez cette option, toutes les propriétés des modèles seront mises à jour automatiquement. Ce processus peut prendre plusieurs minutes. Cette option est susceptible de modifier les URL des filtres de la bibliothèque. Par conséquent, si vous avez des menus ou des liens utilisant ces URL, ils risquent de ne plus fonctionner.\nVous devrez les mettre à jour manuellement. Une fois cette option sélectionnée, vous ne pourrez plus revenir à l'ancienne nomenclature des propriétés. Si vous ne rencontrez pas de problèmes avec les noms de propriétés de vos modèles, nous vous recommandons de ne pas cocher cette case.",
"ar": "يعزز هذا الخيار دعم اللغات غير اللاتينية كلغات افتراضية لمجموعتك.\nسيؤدي تحديد هذا الخيار إلى تحديث جميع خصائص القالب تلقائيًا. وقد تستغرق العملية عدة دقائق. ومن المرجح أن يؤدي تحديد هذا الخيار إلى تغيير عناوين URL الخاصة بفلاتر المكتبة. ونتيجة لذلك، إذا كانت لديك قوائم أو روابط تستخدم هذه العناوين، فمن المحتمل أن تتوقف عن العمل.\nوستحتاج إلى تحديثها يدويًّا. بعد تحديد هذا الخيار، لن تتمكن من العودة إلى استخدام طريقة تسمية الخصائص القديمة. إذا لم تكن تواجه مشكلات مع أسماء خصائص القالب، فننصحك بترك هذا الخيار غير محدد.",
"ko": "이 옵션은 컬렉션의 기본 언어로 비라틴 문자 언어에 대한 지원을 강화합니다.\n이 옵션을 선택하면 모든 템플릿 속성이 자동으로 업데이트됩니다. 이 과정은 몇 분 정도 걸릴 수 있으며, 라이브러리 필터의 URL이 변경될 가능성이 높습니다. 그 결과, 해당 URL을 사용하는 메뉴나 링크가 있는 경우 더 이상 작동하지 않을 수 있습니다.\n이러한 URL은 직접 수정해야 합니다. 이 옵션을 선택하면 이후에는 기존 속성 명명 방식으로 되돌릴 수 없습니다. 템플릿 속성 이름에 문제가 없다면 이 옵션을 선택하지 않는 것을 권장합니다."
},
{
"key": "Character support process warning",
"es": "Este proceso podría demorar varios minutos y probablemente cambiará las URL a los filtros de la colección. Si tienes menús o enlaces que usan dichas URL, probablemente dejarán de funcionar después de la actualización. Deberás actualizarlos manualmente.",
"fr": "Ce processus peut prendre plusieurs minutes et modifiera probablement les URL des filtres de la bibliothèque. Si vous avez des menus ou des liens utilisant ces URL, ils risquent de ne plus fonctionner après la mise à jour. Vous devrez les mettre à jour manuellement.",
"ar": "قد تستغرق هذه العملية عدة دقائق، ومن المرجح أن تؤدي إلى تغيير عناوين URL لتتوافق مع فلاتر المكتبة. إذا كانت لديك قوائم أو روابط تستخدم مثل هذه العناوين، فمن المحتمل أن تتوقف عن العمل بعد التحديث. وسيتعين عليك تحديثها يدويًّا.",
"ko": "이 과정은 몇 분 정도 걸릴 수 있으며, URL이 라이브러리 필터로 변경될 가능성이 높습니다. 이러한 URL을 사용하는 메뉴나 링크가 있는 경우, 업데이트 후 작동하지 않을 수 있습니다. 이 경우 수동으로 수정해야 합니다."
},
{
"key": "Character support revert warning",
"es": "Después de seleccionar esta opción, no podrás volver a usar los nombres de propiedad heredada. Si no tienes problemas con los nombres de las propiedades de tu plantilla, recomendamos no marcar esta opción.",
"fr": "Une fois cette option sélectionnée, vous ne pourrez plus revenir à l'ancienne nomenclature des propriétés. Si vous ne rencontrez pas de problèmes avec les noms de propriétés de vos modèles, nous vous recommandons de ne pas cocher cette case.",
"ar": "بعد تحديد هذا الخيار، لن تتمكن من العودة إلى استخدام طريقة التسمية القديمة للخصائص. إذا لم تكن تواجه أي مشكلات تتعلق بأسماء خصائص القالب، فننصحك بترك هذا الخيار غير محدد.",
"ko": "이 옵션을 선택하면 기존 속성 명명 방식을 다시 사용할 수 없게 됩니다. 템플릿 속성 이름으로 인해 문제가 발생하지 않는다면, 이 옵션을 선택 해제해 두는 것이 좋습니다."
},
{
"key": "Chart",
"es": "Gráfico",
"fr": "Graphique",
"ar": "الرسم البياني",
"ko": "차트"
},
{
"key": "Chart options",
"es": "Opciones del gráfico",
"fr": "Options du graphique",
"ar": "خيارات الرسم البياني",
"ko": "차트 옵션"
},
{
"key": "Chart theme",
"es": "Tema del gráfico",
"fr": "Thème du graphique",
"ar": "سمة المخطط",
"ko": "차트 테마"
},
{
"key": "Chart type",
"es": "Tipo de gráfico",
"fr": "Type de graphique",
"ar": "نوع المخطط",
"ko": "차트 유형"
},
{
"key": "Chart type uses a custom view",
"es": "El tipo de gráfico utiliza una vista personalizada",
"fr": "Le type de graphique utilise une vue personnalisée",
"ar": "يستخدم نوع المخطط طريقة عرض مخصصة",
"ko": "차트 유형은 사용자 정의 보기를 사용합니다"
},
{
"key": "Check to make this instance public (non-logged in users can see public documents and entities)",
"es": "Marca esta opción para que esta instancia sea pública (los usuarios que no hayan iniciado sesión podrán ver los documentos y las entidades públicas)",
"fr": "Cochez cette case pour rendre cette instance publique (les utilisateurs non connectés peuvent consulter les documents et entités publics)",
"ar": "حدد هذا الخيار لجعل هذه الحالة عامة (يمكن للمستخدمين غير المسجلين الاطلاع على المستندات والكيانات العامة)",
"ko": "이 인스턴스를 공개로 설정할지 확인하세요(로그인하지 않은 사용자도 공개 문서 및 엔티티를 볼 수 있습니다)."
},
{
"key": "Checking which images fit the requirements",
"es": "Comprobando qué imágenes cumplen los requisitos...",
"fr": "Vérification en cours des images correspondant aux exigences...",
"ar": "التحقق من الصور التي تتوافق مع المتطلبات...",
"ko": "요건에 맞는 이미지를 확인 중입니다..."
},
{
"key": "Choose",
"es": "Seleccionar",
"fr": "Choisissez",
"ar": "اختر",
"ko": "선택하세요"
},
{
"key": "Choose PDF files"
},
{
"key": "Choose relation type",
"es": "Seleccionar tipo de relación",
"fr": "Choisissez le type de relation",
"ar": "اختر نوع العلاقة",
"ko": "관계 유형 선택"
},
{
"key": "Choose which data to use for training",
"es": "Elige qué datos quieres utilizar para el entrenamiento",
"fr": "Choisissez les données à utiliser pour l'entraînement",
"ar": "اختر البيانات التي تريد استخدامها للتدريب",
"ko": "훈련에 사용할 데이터를 선택하세요"
},
{
"key": "Chrome header",
"es": "Encabezado superior",
"fr": "En-tête de la barre supérieure",
"ar": "الشريط العلوي",
"ko": "Chrome 헤더"
},
{
"key": "Clear",
"es": "Limpiar",
"fr": "Effacer",
"ar": "مسح",
"ko": "지우기"
},
{
"key": "Clear all",
"es": "Limpiar todo",
"fr": "Tout effacer",
"ar": "مسح الكل",
"ko": "모두 지우기"
},
{
"key": "Clear All",
"es": "Limpiar Todo",
"fr": "Tout effacer",
"ar": "مسح الكل",
"ko": "모두 지우기"
},
{
"key": "Clear all filters",
"es": "Borrar todos los filtros",
"fr": "Effacer tous les filtres",
"ar": "مسح جميع عوامل التصفية",
"ko": "모든 필터 지우기"
},
{
"key": "Clear coordinates",
"es": "Limpiar coordenadas",
"fr": "Effacer les coordonnées",
"ar": "مسح الإحداثيات",
"ko": "좌표 초기화"
},
{
"key": "Clear Filters",
"es": "Limpiar filtros",
"fr": "Effacer les filtres",
"ar": "مسح عوامل التصفية",
"ko": "필터 초기화"
},
{
"key": "Clear PDF selection",
"es": "Limpiar la selección PDF",
"fr": "Effacer la sélection dans le PDF",
"ar": "مسح التحديد في ملف PDF",
"ko": "PDF 선택 내용 지우기"
},
{
"key": "Clear search",
"es": "Limpiar búsqueda",
"fr": "Effacer la recherche",
"ar": "مسح البحث",
"ko": "검색 내용 지우기"
},
{
"key": "Click",
"es": "Haz clic",
"fr": "Cliquez",
"ar": "انقر",
"ko": "클릭"
},
{
"key": "Click to fill",
"es": "Click para completar",
"fr": "Cliquez pour remplir",
"ar": "انقر للتعبئة",
"ko": "텍스트 자동 채우기"
},
{
"key": "Click to select an image",
"es": "Click para seleccionar una imagen",
"fr": "Cliquez pour sélectionner une image",
"ar": "انقر لاختيار صورة",
"ko": "이미지를 선택하려면 클릭하세요"
},
{
"key": "Click to select audio or video",
"es": "Click para seleccionar audio o video",
"fr": "Cliquez pour sélectionner un fichier audio ou vidéo",
"ar": "انقر لاختيار ملف صوتي أو فيديو",
"ko": "오디오 또는 동영상을 선택하려면 클릭하세요"
},
{
"key": "Click to select files",
"es": "Click para seleccionar archivos",
"fr": "Cliquez pour sélectionner des fichiers",
"ar": "انقر لاختيار الملفات",
"ko": "클릭하여 파일을 선택하세요"
},
{
"key": "Close",
"es": "Cerrar",
"fr": "Fermer",
"ar": "غلق",
"ko": "닫기"
},
{
"key": "Code",
"es": "Código",
"ar": "الكود",
"ko": "코드"
},
{
"key": "Collaborator",
"es": "Colaboradora",
"fr": "Collaborateur",
"ar": "متعاون/ مساهم",
"ko": "협업자"
},
{
"key": "Collaborators",
"es": "Colaboradores",
"fr": "Collaborateurs",
"ar": "المتعاونون",
"ko": "협력자"
},
{
"key": "Collapse all",
"es": "Colapsar todo",
"fr": "Tout réduire",
"ar": "طي الكل",
"ko": "모두 접기"
},
{
"key": "Collapse All",
"es": "Colapsar todo",
"fr": "Tout réduire",
"ar": "طي الكل",
"ko": "모두 접기"
},
{
"key": "Collection",
"es": "Colección",
"ar": "المجموعة",
"ko": "컬렉션"
},
{
"key": "Collection Name",
"es": "Nombre de la colección",
"fr": "Nom de la collection",
"ar": "اسم المجموعة",
"ko": "컬렉션 이름"
},
{
"key": "Colors",
"es": "Colores",
"fr": "Couleurs",
"ar": "الألوان",
"ko": "색상"
},
{
"key": "Colors come from the server data layer. Preview shows assigned bucket colors when available.",
"es": "Los colores proceden de la capa de datos del servidor. La vista previa muestra los colores asignados a los buckets cuando están disponibles.",
"fr": "Les couleurs proviennent de la couche de données du serveur. L'aperçu affiche les couleurs attribuées aux compartiments lorsqu'elles sont disponibles.",
"ar": "تأتي الألوان من طبقة بيانات الخادم. تعرض المعاينة ألوان المجموعات المخصصة، إن وجدت.",
"ko": "색상은 서버 데이터 계층에서 제공됩니다. 미리보기에서는 가능한 경우 할당된 버킷 색상이 표시됩니다."
},
{
"key": "Columns",
"es": "Columnas",
"fr": "Colonnes",
"ar": "الأعمدة",
"ko": "열"
},
{
"key": "combine or exclude terms",
"es": "combinar o excluir términos",
"fr": "combiner ou exclure des termes",
"ar": "دمج المصطلحات أو استبعادها",
"ko": "검색어 결합 또는 제외"
},
{
"key": "Comfortable",
"es": "Cómoda",
"fr": "Confortable",
"ar": "مريح",
"ko": "편안하게"
},
{
"key": "Common sources",
"es": "Fuentes habituales",
"fr": "Sources courantes",
"ar": "المصادر الشائعة",
"ko": "일반적인 출처"
},
{
"key": "Compact",
"es": "Compacta",
"fr": "Compacte",
"ar": "مضغوط",
"ko": "촘촘하게"
},
{
"key": "Completed",
"es": "Finalizado",
"fr": "Terminé",
"ar": "مكتمل",
"ko": "완료됨"
},
{
"key": "Completed with errors",
"es": "Finalizado con errores",
"fr": "Terminé avec des erreurs",
"ar": "مكتمل مع وجود أخطاء",
"ko": "오류가 있는 상태로 완료됨"
},
{
"key": "Config",
"es": "Configuración",
"fr": "Configuration",
"ar": "الإعدادات",
"ko": "구성"
},
{
"key": "Configuration",
"es": "Configuración",
"ar": "الإعدادات",
"ko": "구성"
},
{
"key": "Configure filters",
"es": "Configurar filtros",
"fr": "Configurer les filtres",
"ar": "ضبط قوائم تصفيه البيانات",
"ko": "필터 구성"
},
{
"key": "Configure templates",
"es": "Configurar plantillas",
"fr": "Configurer les modèles",
"ar": "تكوين القوالب",
"ko": "템플릿 구성"
},
{
"key": "Confirm",
"es": "Confirmar",
"fr": "Confirmer",
"ar": "تأكيد",
"ko": "확인"
},
{
"key": "CONFIRM",
"es": "CONFIRMAR",
"fr": "CONFIRMER",
"ar": "تأكيد",
"ko": "확인"
},
{
"key": "Confirm action",
"es": "Confirmar acción",
"fr": "Confirmer l'action",
"ar": "تأكيد الإجراء",
"ko": "작업 확인"
},
{
"key": "Confirm delete connection",
"es": "Confirmar eliminación de relación",
"fr": "Confirmer la suppression de la connexion",
"ar": "تأكيد حذف الاتصال",
"ko": "연결 삭제 확인"
},
{
"key": "Confirm delete multiple items",
"es": "Confirmar eliminación de múltiples elementos",
"fr": "Êtes-vous sûr de vouloir supprimer tous les éléments sélectionnés ?",
"ar": "هل ترغب في حذف كل العناصر المختارة؟",
"ko": "선택한 모든 항목을 정말로 삭제하시겠습니까?"
},
{
"key": "Confirm deletion",
"es": "Confirmar la eliminación",
"fr": "Confirmer la suppression",
"ar": "تأكيد الحذف",
"ko": "삭제 확인"
},
{
"key": "Confirm deletion of",
"es": "Confirmar la eliminación de",
"fr": "Confirmer la suppression de",
"ar": "تأكيد حذف",
"ko": "다음 항목의 삭제를 확인하십시오."
},
{
"key": "Confirm deletion of entity",
"es": "Confirmar eliminación de entidad",
"fr": "Confirmer la suppression de l'entité",
"ar": "تأكيد حذف الكيان",
"ko": "엔티티 삭제 확인"
},
{
"key": "Confirm deletion of file",
"es": "Confirmar eliminación de archivo",
"fr": "Confirmer la suppression du fichier",
"ar": "تأكيد حذف الملف",
"ko": "파일 삭제 확인"
},
{
"key": "Confirm new password",
"es": "Confirmar nueva contraseña",
"fr": "Confirmer le nouveau mot de passe",
"ar": "تأكيد كلمة المرور الجديدة",
"ko": "새 비밀번호 확인"
},
{
"key": "Confirm your password",
"es": "Confirma tu contraseña",
"fr": "Confirmez votre mot de passe",
"ar": "تأكيد كلمة المرور",
"ko": "비밀번호 확인"
},
{
"key": "Connect to a paragraph",
"es": "Conectar a un párrafo",
"fr": "Se connecter à un paragraphe",
"ar": "الاتصال بفقرة",
"ko": "단락과 연결"
},
{
"key": "Connect to an entity",
"es": "Conectarse a una entidad",
"fr": "Se connecter à une entité",
"ar": "الاتصال بكيان ما",
"ko": "엔티티에 연결하기"
},
{
"key": "Connect to entity",
"es": "Conectar a entidad",
"fr": "Se connecter à l'entité",
"ar": "الاتصال بالكيان",
"ko": "엔티티에 연결"
},
{
"key": "Connected entities",
"es": "Entidades conectadas",
"fr": "Entités liées",
"ar": "الكيانات المرتبطة",
"ko": "연결된 엔티티"
},
{
"key": "Connected to server",
"es": "Conectado al servidor",
"fr": "Connecté au serveur",
"ar": "متصل بالخادم",
"ko": "서버에 연결됨"
},
{
"key": "Connection type",
"es": "Tipo de relación",
"fr": "Type de connexion",
"ar": "نوع الاتصال",
"ko": "커넥션 유형"
},
{
"key": "Contact email description",
"es": "Aquí puedes configurar el correo electrónico de contacto y el que aparece cuando Uwazi envía una notificación a un usuario",
"fr": "Vous pouvez configurer ici l'e-mail de contact ainsi que l'adresse qui apparaît lorsque Uwazi envoie une notification à un utilisateur",
"ar": "هنا يمكنك إعداد عنوان البريد الإلكتروني الخاص بالجهة المسؤولة وعنوان البريد الإلكتروني الذي يظهر عندما ترسل Uwazi إشعارًا إلى أحد المستخدمين",
"ko": "여기에서는 연락처 이메일과 Uwazi가 사용자에게 알림을 보낼 때 표시되는 이메일을 설정할 수 있습니다."
},
{
"key": "Contact Form",
"es": "Formulario de contacto",
"fr": "Formulaire de contact",
"ar": "استمارة اتصال",
"ko": "연락처"
},
{
"key": "Contact form email",
"es": "Correo electrónico del formulario de contacto",
"fr": "E-mail du formulaire de contact",
"ar": "البريد الإلكتروني الخاص بنموذج الاتصال",
"ko": "문의 양식 이메일"
},
{
"key": "Contains",
"es": "Contiene",
"fr": "Contient",
"ar": "يحتوي على",
"ko": "포함"
},
{
"key": "Content translations",
"es": "Traducciones de contenido",
"fr": "Traductions de contenu",
"ar": "ترجمة المحتوى",
"ko": "콘텐츠 번역"
},
{
"key": "Context",
"es": "Contexto",
"fr": "Contexte",
"ar": "السياق",
"ko": "문맥"
},
{
"key": "Continue",
"es": "Continuar",
"fr": "Continuer",
"ar": "تابع",
"ko": "계속"
},
{
"key": "Conversion failed",
"es": "La conversión ha fallado",
"fr": "Échec de la conversion",
"ar": "فشل التحويل",
"ko": "변환 실패"
},
{
"key": "Cookie preferences",
"es": "Preferencias de cookies",
"fr": "Préférences en matière de cookies",
"ar": "تفضيلات ملفات تعريف الارتباط",
"ko": "쿠키 설정"
},
{
"key": "Copied",
"es": "Copiado",
"fr": "Copié",
"ar": "تم النسخ",
"ko": "복사됨"
},
{
"key": "Copied to clipboard",
"es": "Copiado al clipboard",
"fr": "Copié dans le presse-papiers",
"ar": "تم نسخه إلى الحافظة",
"ko": "클립보드에 복사됨"
},
{
"key": "Copy",
"es": "Copiar",
"fr": "Copier",
"ar": "نسخ",
"ko": "복사"
},
{
"key": "Copy From",
"es": "Copiar desde",
"fr": "Copier de",
"ar": "النسخ من",
"ko": "외부 복사"
},
{
"key": "Copy from",
"es": "Copiar desde",
"fr": "Copier depuis",
"ar": "النسخ من",
"ko": "다음에서 복사"
},
{
"key": "Copy from this entity",
"es": "Copiar desde esta entidad",
"fr": "Copier depuis cette entité",
"ar": "النسخ من هذا الكيان",
"ko": "이 엔티티에서 복사"
},
{
"key": "Copy from...",
"es": "Copiar desde...",
"fr": "Copier depuis…",
"ar": "نسخ من...",
"ko": "다음에서 복사..."
},
{
"key": "Copy Highlighted",
"es": "Copiar lo resaltado",
"fr": "Copier surligné",
"ar": "نسخ المظلل",
"ko": "하이라이트 복사"
},
{
"key": "Copy link",
"es": "Copiar enlace",
"fr": "Copier le lien",
"ar": "نسخ الرابط",
"ko": "링크 복사"
},
{
"key": "Copy properties to this entity from",
"es": "Copiar las propiedades a esta entidad desde",
"fr": "Copier les propriétés de cette entité à partir de",
"ar": "انسخ الخصائص إلى هذا الكيان (الإدخال) من",
"ko": "이 엔티티의 속성 복사"
},
{
"key": "Copy to clipboard",
"es": "Copiar al portapapeles",
"fr": "Copier dans le presse-papiers",
"ar": "نسخ إلى الحافظة",
"ko": "클립보드에 복사"
},
{
"key": "Could not add media. Please try again.",
"es": "No se pudo agregar el archivo. Por favor intenta nuevamente.",
"fr": "Impossible d'ajouter un fichier multimédia. Veuillez réessayer.",
"ar": "تعذر إضافة الملفات. يرجى المحاولة مرة أخرى.",
"ko": "미디어를 추가할 수 없습니다. 다시 시도해 주세요."
},
{
"key": "Could not add thesaurus value",
"es": "No se pudo agregar el valor del tesauro"
},
{
"key": "Could not be processed",
"es": "El proceso no ha sido posible",
"fr": "N'a pas pu être traité",
"ar": "لا يمكن معالجتها",
"ko": "처리할 수 없습니다"
},
{
"key": "Could not create entity",
"es": "No se pudo crear la entidad",
"fr": "Impossible de créer l'entité",
"ar": "تعذر إنشاء الكيان",
"ko": "엔티티를 생성할 수 없습니다."
},
{
"key": "Could not detect the area for the selected text",
"es": "No se pudo detectar el área para el texto seleccionado, por favor intenta seleccionar nuevamente.",
"fr": "Impossible de détecter la zone du texte sélectionné, veuillez réessayer la sélection.",
"ar": "تعذر تحديد منطقة النص المحدد، يرجى محاولة التحديد مرة أخرى.",
"ko": "선택한 텍스트의 영역을 감지할 수 없습니다. 다시 선택해 주십시오."
},
{
"key": "Could not load suggestions.",
"es": "No se han podido cargar las sugerencias.",
"fr": "Impossible de charger les suggestions.",
"ar": "تعذر تحميل الاقتراحات.",
"ko": "제안 사항을 불러올 수 없습니다."
},
{
"key": "Could not reach server. Please try again later.",
"es": "No se puede conectar con el servidor. Por favor intenta después.",
"fr": "Impossible d'accéder au serveur. Veuillez réessayer plus tard.",
"ar": "تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقًا.",
"ko": "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
},
{
"key": "Count",
"es": "Recuento",
"fr": "Nombre",
"ar": "العدد",
"ko": "개수"
},
{
"key": "Create",
"es": "Crear",
"fr": "Créer",
"ar": "أنشئ",
"ko": "생성"
},
{
"key": "CREATE",
"es": "Crear",
"fr": "Créer",
"ar": "أنشئ",
"ko": "생성"
},
{
"key": "Create a type to continue.",
"es": "Crea un tipo para continuar.",
"fr": "Créez un type pour continuer.",
"ar": "أنشئ نوعًا للمتابعة.",
"ko": "계속하려면 유형을 생성하세요."
},
{
"key": "Create and edit thesauri",
"es": "Crear y editar tesauro",
"fr": "Créer et modifier des thésaurus",
"ar": "إنشاء وتحرير قوائم المرادفات",
"ko": "시소러스 생성 및 편집"
},
{
"key": "Create Connection",
"es": "Crear Conexión",
"fr": "Créer une connexion",
"ar": "إنشاء اتصال",
"ko": "연결 만들기"
},
{
"key": "Create entity",
"es": "Crear entidad",
"fr": "Créer une entité",
"ar": "إنشاء كيان",
"ko": "엔티티 생성"
},
{
"key": "Create Entity",
"es": "Crear entidad",
"fr": "Créer une entité",
"ar": "إنشاء كيان",
"ko": "엔티티 생성"
},
{
"key": "Create Extractor",
"es": "Crear extractor",
"fr": "Créer un extracteur",
"ar": "إنشاء أداة استخراج",
"ko": "추출기 생성"
},
{
"key": "Create new entities and upload documents",
"es": "Crear nuevas entidades y subir documentos",
"fr": "Créer de nouvelles entités et télécharger des documents",
"ar": "إنشاء كيانات جديدة وتحميل المستندات",
"ko": "새로운 엔티티 생성 및 문서 업로드"
},
{
"key": "Create new entity from selection",
"es": "Crear nueva entidad desde selección",
"fr": "Créer une nouvelle entité à partir de la sélection",
"ar": "إنشاء كيان جديد من العناصر المحددة",
"ko": "선택한 항목으로 새 엔티티 생성"
},
{
"key": "Create Reference",
"es": "Crear Referencia",
"fr": "Créer une référence",
"ar": "إنشاء مرجع",
"ko": "참조 생성"
},
{
"key": "Create relationship",
"es": "Crear relación",
"fr": "Créer une relation",
"ar": "إنشاء علاقة",
"ko": "관계 생성"
},
{
"key": "Create relationship types",
"es": "Crear tipos de relación",
"fr": "Créer des types de relations",
"ar": "إنشاء أنواع العلاقات",
"ko": "관계 유형 생성"
},
{
"key": "Create relationships and references",
"es": "Crear relaciones y referencias",
"fr": "Créer des relations et des références",
"ar": "إنشاء العلاقات والمراجع",
"ko": "관계 및 참조 생성하기"
},
{
"key": "Create table of contents",
"es": "Crear tabla de contenidos",
"fr": "Créer une table des matières",
"ar": "إنشاء فهرس",
"ko": "목차 만들기"
},
{
"key": "Create visualization",
"es": "Crear visualización",
"fr": "Créer une visualisation",
"ar": "إنشاء عرض مرئي",
"ko": "시각화 생성"
},
{
"key": "Created",
"es": "Creado",
"fr": "Créé",
"ar": "تم إنشاؤه",
"ko": "생성됨"
},
{
"key": "Created entity",
"es": "Entidad creada",
"fr": "Entité créée",
"ar": "الكيان الذي تم إنشاؤه",
"ko": "생성된 엔티티"
},
{
"key": "Created entity coming from a public form",
"es": "Entidad creada desde un formulario público",
"fr": "Entité créée à partir d’un formulaire public",
"ar": "كيان تم إنشاؤه من نموذج عام",
"ko": "공개 양식을 통해 생성된 엔티티"
},
{
"key": "Created page",
"es": "Página creada",
"fr": "Page créée",
"ar": "تم إنشاء الصفحة",
"ko": "페이지 생성"
},
{
"key": "Created relation type",
"es": "Tipo de relación creado",
"fr": "Type de relation créé",
"ar": "نوع العلاقة التي تم إنشاؤها",
"ko": "생성된 관계 유형"
},
{
"key": "Created relationship",
"es": "Relación creada",
"fr": "Relation créée",
"ar": "علاقة تم إنشاؤها",
"ko": "관계 생성"
},
{
"key": "Created template",
"es": "Plantilla creada",
"fr": "Modèle créé",
"ar": "تم إنشاء القالب",
"ko": "템플릿 생성됨"
},
{
"key": "Created thesaurus",
"es": "Tesauro creado",
"fr": "Thésaurus créé",
"ar": "تم إنشاء قاموس المرادفات",
"ko": "시소러스 생성"
},
{
"key": "Created user group",
"es": "Grupo de usuarios creado",
"fr": "Groupe d'utilisateurs créé",
"ar": "تم إنشاء مجموعة مستخدمين",
"ko": "사용자 그룹 생성"
},
{
"key": "Creating entities",
"es": "Creación de entidades",
"fr": "Création d'entités",
"ar": "إنشاء الكيانات",
"ko": "엔티티 생성"
},
{
"key": "Creating relationships",
"es": "Creación de relaciones",
"fr": "Création de relations",
"ar": "إنشاء العلاقات",
"ko": "관계 형성"
},
{
"key": "Creating thesauri",
"es": "Creación de tesauros",
"fr": "Création de thésaurus",
"ar": "إنشاء قواميس المرادفات",
"ko": "시소러스 작성"
},
{
"key": "Creation date",
"es": "Fecha de creación",
"fr": "Date de création",
"ar": "تاريخ الإنشاء",
"ko": "생성한 날짜"
},
{
"key": "CSS"
},
{
"key": "csv blank state message",
"es": "Importa archivos CSV o ZIP para crear entidades en lote. Para empezar, selecciona **+ Importar CSV**.",
"fr": "Importez des fichiers CSV ou ZIP pour créer des entités en masse. Sélectionnez **+ Importer CSV** pour commencer.",
"ar": "استيراد ملفات CSV أو ZIP لإنشاء كيانات بشكل جماعي. حدد **+ استيراد CSV** للبدء.",
"ko": "CSV 또는 ZIP 파일을 가져와 엔티티를 일괄 생성할 수 있습니다. 시작하려면 **+ CSV 가져오기**를 선택하세요."
},
{
"key": "CSV Import",
"es": "Importación de CSV",
"fr": "Importation CSV",
"ar": "استيراد ملف CSV",
"ko": "CSV 가져오기"
},
{
"key": "CSV import cancelled",
"es": "Importación de CSV cancelada",
"fr": "Importation CSV annulée",
"ar": "تم إلغاء استيراد ملف CSV",
"ko": "CSV 가져오기가 취소되었습니다."
},
{
"key": "CSV import completed",
"es": "Importación de CSV completada",
"fr": "Importation du fichier CSV terminée",
"ar": "اكتمل استيراد ملف CSV",
"ko": "CSV 가져오기가 완료되었습니다."
},
{
"key": "CSV import failed",
"es": "Importación de CSV fallida",
"fr": "Échec de l'importation du fichier CSV",
"ar": "فشل استيراد ملف CSV",
"ko": "CSV 가져오기에 실패했습니다."
},
{
"key": "CSV or ZIP",
"es": "CSV o ZIP",
"fr": "Fichier CSV ou ZIP",
"ar": "ملف CSV أو ZIP",
"ko": "CSV 또는 ZIP 파일"
},
{
"key": "Ctrl K",
"es": "Ctrl+K",
"fr": "Ctrl+K",
"ko": "Ctrl+K"
},
{
"key": "Current Value/Suggestion",
"es": "Valor actual/Sugerencia",
"fr": "Valeur actuelle / Suggestion",
"ar": "القيمة الحالية/الاقتراح",
"ko": "현재 값/제안 사항"
},
{
"key": "Custom colors are not available for this chart type. Use the chart palette or template\n            colors instead.",
"es": "No se pueden utilizar colores personalizados en este tipo de gráfico. Utiliza, en su lugar, la paleta de colores del gráfico o los\ncolores de la plantilla.",
"fr": "Les couleurs personnalisées ne sont pas disponibles pour ce type de graphique. Utilisez plutôt la palette de couleurs du graphique ou les\ncouleurs du modèle.",
"ar": "الألوان المخصصة غير متوفرة لهذا النوع من المخططات. استخدم لوحة ألوان المخطط أو\nألوان القوالب بدلاً من ذلك.",
"ko": "이 차트 유형에서는 사용자 지정 색상을 사용할 수 없습니다. 대신 차트 팔레트나 템플릿\n색상을 사용하십시오."
},
{
"key": "Custom component error",
"es": "Error en el componente de marcado personalizado: valores no soportados! Por favor revisa tu configuración",
"fr": "Erreur de balisage du composant personnalisé : valeurs non prises en charge ! Veuillez vérifier votre configuration",
"ar": "خطأ في ترميز المكوّن المخصص: قيم غير مدعومة! يرجى التحقق من إعداداتك",
"ko": "사용자 정의 구성 요소 마크업 오류: 지원되지 않는 값입니다! 구성을 확인해 주세요."
},
{
"key": "Custom CSS",
"es": "CSS personalizado",
"fr": "CSS personnalisé",
"ar": "CSS تنسيق",
"ko": "사용자 맞춤 CSS"
},
{
"key": "Custom Favicon",
"es": "Favicon personalizado",
"fr": "Favicon personnalisée",
"ar": "أيقونة مفضلة مخصصة",
"ko": "사용자 지정 파비콘"
},
{
"key": "Custom JS",
"es": "JS Personalizado",
"fr": "JS personnalisé",
"ar": "جافا سكريبت مخصص",
"ko": "사용자 정의 JS"
},
{
"key": "Custom landing page",
"es": "Página de destino personalizada",
"fr": "Page d'accueil personnalisée",
"ar": "صفحة هبوط مخصصة",
"ko": "맞춤형 랜딩 페이지"
},
{
"key": "custom page error warning",
"es": "Hay un error inesperado en esta página personalizada, es posible que no funcione correctamente. Ponte en contacto con un administrador para más detalles.",
"fr": "Une erreur inattendue s'est produite sur cette page personnalisée, il se peut qu'elle ne fonctionne pas correctement. Veuillez contacter un administrateur pour plus de détails.",
"ar": "حدث خطأ غير متوقع في هذه الصفحة المخصصة، وقد لا تعمل بشكل صحيح. يرجى الاتصال بأحد المسؤولين للحصول على مزيد من التفاصيل.",
"ko": "이 사용자 지정 페이지에서 예기치 않은 오류가 발생하여 정상적으로 작동하지 않을 수 있습니다. 자세한 내용은 관리자에게 문의해 주십시오."
},
{
"key": "Custom Uploads",
"es": "Subidas personalizadas",
"fr": "Téléchargements personnalisés",
"ar": "تحميل مخصص",
"ko": "사용자 맞춤 업로드"
},
{
"key": "Customize",
"es": "Personalizar",
"fr": "Personnaliser",
"ar": "تخصيص",
"ko": "사용자 지정"
},
{
"key": "Customized",
"es": "Personalizado",
"fr": "Personnalisé",
"ar": "مخصّص",
"ko": "맞춤형"
},
{
"key": "Dark",
"es": "Oscuro",
"fr": "Sombre",
"ar": "مظلم",
"ko": "다크"
},
{
"key": "Dark Theme",
"es": "Tema oscuro",
"fr": "Thème sombre",
"ar": "السمة الداكنة",
"ko": "다크 테마"
},
{
"key": "Dashboard",
"es": "Tablero",
"fr": "Tableau de bord",
"ar": "لوحة التحكم",
"ko": "대시보드"
},
{
"key": "Data may be outdated.",
"es": "Es posible que los datos estén desactualizados.",
"fr": "Les données peuvent être obsolètes.",
"ar": "قد تكون البيانات قديمة.",
"ko": "데이터가 최신 정보가 아닐 수 있습니다."
},
{
"key": "Data source",
"es": "Fuente de datos",
"fr": "Source des données",
"ar": "مصدر البيانات",
"ko": "데이터 출처"
},
{
"key": "Data sources",
"es": "Fuentes de datos",
"fr": "Sources des données",
"ar": "مصادر البيانات",
"ko": "데이터 출처"
},
{
"key": "Data visualizations",
"es": "Visualizaciones de datos",
"fr": "Visualisations de données",
"ar": "تصورات البيانات",
"ko": "데이터 시각화"
},
{
"key": "Data was updated recently. You can refresh again in a few seconds.",
"es": "Los datos se han actualizado recientemente. Puedes volver a actualizar en unos segundos.",
"fr": "Les données ont été mises à jour récemment. Vous pourrez actualiser de nouveau dans quelques secondes.",
"ar": "تم تحديث البيانات مؤخرًا. يمكنك تحديث الصفحة مرة أخرى بعد بضع ثوانٍ.",
"ko": "데이터가 최근에 업데이트되었습니다. 몇 초 후에 다시 새로 고침해 주세요."
},
{
"key": "Date",
"es": "Fecha",
"ar": "التاريخ",
"ko": "날짜"
},
{
"key": "Date added",
"es": "Fecha de creación",
"fr": "Date ajoutée",
"ar": "تم إضافة التاريخ",
"ko": "추가한 날짜"
},
{
"key": "Date modified",
"es": "Fecha de la modificación",
"fr": "Date de modification",
"ar": "تاريخ التعديل",
"ko": "수정한 날짜"
},
{
"key": "Date or numeric × numeric enables scatter and heatmap. Line, area, and bar plot the\n                measure over the primary dimension (e.g. max engine size per registration date).",
"es": "Los datos de tipo \"fecha\" o \"numérico × numérico\" permiten crear gráficos de dispersión y mapas de calor. Los gráficos de líneas, áreas y barras representan la\nmedida en función de la dimensión principal (por ejemplo, el tamaño máximo del motor por fecha de matriculación).",
"fr": "Les combinaisons \"date\" ou \"valeur numérique × valeur numérique\" permettent d'afficher un nuage de points et une carte thermique. Les graphiques linéaires, en aires et à barres représentent la\n mesure en fonction de la dimension principale (par exemple, la cylindrée maximale par date d'immatriculation).",
"ar": "يتيح استخدام «التاريخ» أو «رقم × رقم» عرض مخطط الانتشار وخريطة الحرارة. أما مخططات الخطوط والمساحة والأعمدة، فترسم\nالقيمة وفقًا للبعد الأساسي (مثل: الحجم الأقصى للمحرك حسب تاريخ التسجيل).",
"ko": "날짜 또는 숫자 × 숫자 조합은 산점도와 히트맵을 생성합니다. 선, 면, 막대 차트는\n 주 차원에 대한 측정값을 표시합니다(예: 등록일별 최대 엔진 크기)."
},
{
"key": "Date or numeric × select enables line and area charts with one line per breakdown\n                value over time.",
"es": "Fecha o valor numérico × \"seleccionar\" permite crear gráficos de líneas y de área con una línea por valor de desglose\na lo largo del tiempo.",
"fr": "Date ou valeur numérique × sélection : permet de créer des graphiques linéaires et en aires avec une ligne par valeur de ventilation\n au fil du temps.",
"ar": "التاريخ أو الرقم × \"تحديد\" يتيح إنشاء مخططات خطية ومساحية بخط واحد لكل قيمة تفصيلية\nعلى مدار الزمن.",
"ko": "날짜 또는 숫자 × 선택 시, 시간 경과에 따른 각 세분화\n값마다 한 줄씩 표시되는 선형 및 면적 차트가 생성됩니다."
},
{
"key": "Date range",
"es": "Intervalo de fechas",
"fr": "Plage de dates",
"ar": "النطاق الزمني",
"ko": "날짜 범위"
},
{
"key": "Day",
"es": "Día",
"fr": "Jour",
"ar": "يوم",
"ko": "일자"
},
{
"key": "Deep-merged onto the generated ECharts option. Use for fine-tuning options not exposed in\n          the Chart tab.",
"es": "Integrado en profundidad en la opción ECharts generada. Se utiliza para ajustar con precisión opciones que no aparecen en\n la pestaña \"Gráfico\".",
"fr": "Intégré en profondeur dans l'option ECharts générée. À utiliser pour affiner les paramètres qui ne sont pas accessibles dans\nl'onglet \"Graphique\".",
"ar": "مدمجة بشكل عميق في خيار ECharts الذي تم إنشاؤه. تُستخدم لضبط الخيارات التي لا تظهر في\nعلامة التبويب «الرسم البياني».",
"ko": "생성된 ECharts 옵션에 깊이 통합되어 있습니다. [차트] 탭에 표시되지 않는 옵션을\n세밀하게 조정할 때 사용합니다."
},
{
"key": "Default",
"es": "Predeterminado",
"fr": "Par défaut",
"ar": "الافتراضي",
"ko": "기본값"
},
{
"key": "Default date format",
"es": "Formato de fecha predeterminado",
"fr": "Format de date par défaut",
"ar": "تنسيق التاريخ الافتراضي",
"ko": "기본 날짜 형식"
},
{
"key": "Default filter",
"es": "Filtro predeterminado",
"fr": "Filtre par défaut",
"ar": "عامل تصفية افتراضي",
"ko": "기본 필터"
},
{
"key": "Default language",
"es": "Idioma Predeterminado",
"fr": "Langue par défaut",
"ar": "اللغة الافتراضية",
"ko": "기본 언어"
},
{
"key": "Default language change success",
"es": "Cambio de idioma predeterminado exitoso",
"fr": "Succès du changement de langue par défaut",
"ar": "نجاح تغيير اللغة الافتراضية",
"ko": "기본 언어 변경 완료"
},
{
"key": "Default template",
"es": "Plantilla predeterminada",
"fr": "Modèle par défaut",
"ar": "القالب الافتراضي",
"ko": "기본 템플릿"
},
{
"key": "Default template set successfully.",
"es": "La plantilla predeterminada se ha configurado correctamente.",
"fr": "Le modèle par défaut a été défini avec succès.",
"ar": "تم تعيين القالب الافتراضي بنجاح.",
"ko": "기본 템플릿이 성공적으로 설정되었습니다."
},
{
"key": "Default View",
"es": "Vista predeterminada",
"fr": "Affichage par défaut",
"ar": "العرض الافتراضي",
"ko": "기본 보기"
},
{
"key": "Delete",
"es": "Eliminar",
"fr": "Effacer",
"ar": "حذف",
"ko": "삭제"
},
{
"key": "DELETE",
"es": "Eliminar",
"fr": "Effacer",
"ar": "حذف",
"ko": "삭제"
},
{
"key": "Delete entities and documents",
"es": "Eliminar entidades y documentos",
"fr": "Supprimer des entités et des documents",
"ar": "حذف الكيانات والمستندات",
"ko": "엔티티 및 문서 삭제"
},
{
"key": "Delete file",
"es": "Eliminar archivo",
"fr": "Supprimer le fichier",
"ar": "مسح الملف",
"ko": "파일 삭제"
},
{
"key": "Delete relationship",
"es": "Eliminar relación",
"fr": "Supprimer la relation",
"ar": "حذف العلاقة",
"ko": "관계 삭제"
},
{
"key": "Delete relationships",
"es": "Eliminar relaciones",
"fr": "Supprimer les relations",
"ar": "حذف العلاقات",
"ko": "관계 삭제"
},
{
"key": "Delete?",
"es": "¿Borrar?",
"fr": "Supprimer ?",
"ar": "حذف؟",
"ko": "삭제하시겠습니까?"
},
{
"key": "Deleted attachment",
"es": "Archivo adjunto eliminado",
"fr": "Pièce jointe supprimée",
"ar": "ملحق محذوف",
"ko": "첨부 파일 삭제됨"
},
{
"key": "Deleted custom file",
"es": "Archivo personalizado eliminado",
"fr": "Fichier personnalisé supprimé",
"ar": "تم حذف ملف مخصص",
"ko": "사용자 정의 파일 삭제됨"
},
{
"key": "Deleted entity",
"es": "Entidad eliminada",
"fr": "Entité supprimée",
"ar": "كيان محذوف",
"ko": "삭제된 엔티티"
},
{
"key": "Deleted file",
"es": "Archivo eliminado",
"fr": "Fichier supprimé",
"ar": "ملف محذوف",
"ko": "삭제된 파일"
},
{
"key": "Deleted multiple entities",
"es": "Entidades eliminadas",
"fr": "Plusieurs entités supprimées",
"ar": "تم حذف عدة كيانات",
"ko": "삭제된 여러 엔티티"
},
{
"key": "Deleted page",
"es": "Página eliminada",
"fr": "Page supprimée",
"ar": "صفحة محذوفة",
"ko": "삭제된 페이지"
},
{
"key": "Deleted relation type",
"es": "Tipo de relación eliminada",
"fr": "Type de relation supprimé",
"ar": "نوع العلاقة المحذوف",
"ko": "삭제된 관계 유형"
},
{
"key": "Deleted relationship",
"es": "Relación eliminada",
"fr": "Relation supprimée",
"ar": "علاقة محذوفة",
"ko": "삭제된 관계"
},
{
"key": "Deleted successfully.",
"es": "Eliminado exitosamente.",
"fr": "Suppression effectuée avec succès.",
"ar": "تم الحذف بنجاح.",
"ko": "성공적으로 삭제되었습니다."
},
{
"key": "Deleted template",
"es": "Plantilla eliminada",
"fr": "Modèle supprimé",
"ar": "قالب محذوف",
"ko": "삭제된 템플릿"
},
{
"key": "Deleted thesaurus",
"es": "Tesauro eliminado",
"fr": "Thésaurus supprimé",
"ar": "قاموس مرادفات محذوف",
"ko": "삭제된 시소러스"
},
{
"key": "Deleted user",
"es": "Usuario eliminado",
"fr": "Utilisateur supprimé",
"ar": "مستخدم محذوف",
"ko": "삭제된 사용자"
},
{
"key": "Deleted user group",
"es": "Grupo de usuarios eliminado",
"fr": "Groupe d'utilisateurs supprimé",
"ar": "مجموعة مستخدمين محذوفة",
"ko": "삭제된 사용자 그룹"
},
{
"key": "Deletion success",
"es": "Eliminación exitosa",
"fr": "Suppression réussie",
"ar": "تم الحذف بنجاح",
"ko": "삭제 성공"
},
{
"key": "Density",
"es": "Densidad",
"fr": "Densité",
"ar": "الكثافة",
"ko": "밀도"
},
{
"key": "Description",
"es": "Descripción",
"ar": "وصف",
"ko": "설명"
},
{
"key": "Deselect all",
"es": "Deseleccionar todo",
"fr": "Tout désélectionner",
"ar": "إلغاء تحديد الكل",
"ko": "모두 선택 해제"
},
{
"key": "Details",
"es": "Detalle",
"fr": "Détails",
"ar": "التفاصيل",
"ko": "상세 정보"
},
{
"key": "Direction",
"es": "Dirección",
"ar": "الاتجاه",
"ko": "방향"
},
{
"key": "Disable",
"es": "Desactivar",
"fr": "Désactiver",
"ar": "تعطيل",
"ko": "비활성화"
},
{
"key": "Disable highlights",
"es": "Desactivar el resaltado",
"fr": "Désactiver la mise en évidence",
"ar": "تعطيل التمييز بالألوان",
"ko": "하이라이트 비활성화"
},
{
"key": "Disabled 2FA",
"es": "Autenticación de dos factores desactivada",
"fr": "Authentification à deux facteurs désactivée",
"ar": "تم تعطيل المصادقة الثنائية (2FA)",
"ko": "2단계 인증 비활성화"
},
{
"key": "Discard",
"es": "Descartar",
"fr": "Abandonner",
"ar": "تجاهل",
"ko": "취소"
},
{
"key": "Discard changes",
"es": "Descartar cambios",
"fr": "Annuler les modifications",
"ar": "تجاهل التغييرات",
"ko": "변경 취소"
},
{
"key": "Discard changes?",
"es": "Descartar cambios?",
"fr": "Annuler les modifications ?",
"ar": "هل تريد إلغاء التغييرات؟",
"ko": "변경 내용을 취소하시겠습니까?"
},
{
"key": "Dismiss",
"es": "Descartar",
"fr": "Ignorer",
"ar": "إغلاق",
"ko": "닫기"
},
{
"key": "Display entity view from page",
"es": "Mostrar entidad de visualización desde la página",
"fr": "Afficher la vue de l'entité depuis la page",
"ar": "عرض معاينة الكيان (الإدخال) من الصفحة",
"ko": "페이지에서 엔티티 뷰 표시"
},
{
"key": "Display options",
"es": "Opciones de visualización",
"fr": "Options d'affichage",
"ar": "خيارات العرض",
"ko": "표시 옵션"
},
{
"key": "Do you want disable 2FA for the following users?",
"es": "¿Quieres desactivar la autenticación de dos factores (2FA) para los siguientes usuarios?",
"fr": "Souhaitez-vous désactiver l'authentification à deux facteurs (2FA) pour les utilisateurs suivants ?",
"ar": "هل تريد تعطيل المصادقة الثنائية (2FA) للمستخدمين التاليين؟",
"ko": "다음 사용자에 대해 2단계 인증을 비활성화하시겠습니까?"
},
{
"key": "Do you want reset the password for the following users?",
"es": "¿Quieres restablecer la contraseña de los siguientes usuarios?",
"fr": "Souhaitez-vous réinitialiser le mot de passe des utilisateurs suivants ?",
"ar": "هل تريد إعادة تعيين كلمة المرور للمستخدمين التاليين؟",
"ko": "다음 사용자들의 비밀번호를 재설정하시겠습니까?"
},
{
"key": "Do you want to delete the following items?",
"es": "¿Quieres eliminar los siguientes elementos?",
"fr": "Souhaitez-vous supprimer les éléments suivants ?",
"ar": "هل تريد حذف العناصر التالية؟",
"ko": "다음 항목을 삭제하시겠습니까?"
},
{
"key": "Document",
"es": "Documento",
"ar": "مستند",
"ko": "문서"
},
{
"key": "Document contents",
"es": "Contenidos del documento",
"fr": "Contenu du document",
"ar": "محتويات المستند",
"ko": "문서 내용"
},
{
"key": "Document OCR trigger",
"es": "Desencadenador de OCR de documento",
"fr": "Déclencheur OCR pour les documents",
"ar": "مشغل التعرف الضوئي على الحروف (OCR) للوثيقة",
"ko": "문서 OCR 트리거"
},
{
"key": "Document Title",
"es": "Título del documento",
"fr": "Titre du document",
"ar": "عنوان المستند",
"ko": "문서 제목"
},
{
"key": "Document updated",
"es": "Documento actualizado",
"fr": "Document mis à jour",
"ar": "تم تحديث الوثيقة",
"ko": "문서 업데이트됨"
},
{
"key": "Documentation",
"es": "Documentación",
"ar": "توثيق",
"ko": "기록"
},
{
"key": "documents",
"es": "Documentos",
"fr": "Documents",
"ar": "وثائق",
"ko": "문서"
},
{
"key": "Documents",
"es": "Documentos",
"ar": "وثائق",
"ko": "문서"
},
{
"key": "documents.",
"es": "documentos.",
"fr": "Documents.",
"ar": "مستندات",
"ko": "문서"
},
{
"key": "Done",
"es": "Hecho",
"fr": "Terminé",
"ar": "تم",
"ko": "완료"
},
{
"key": "Done creating entities",
"es": "Se ha finalizado la creación de entidades",
"fr": "La création des entités est terminée",
"ar": "تم الانتهاء من إنشاء الكيانات",
"ko": "엔티티 생성이 완료되었습니다."
},
{
"key": "Done creating relationships",
"es": "Se ha finalizado la creación de las relaciones.",
"fr": "La création des relations est terminée",
"ar": "تم إنشاء العلاقات",
"ko": "관계 생성 완료"
},
{
"key": "Done creating thesauri",
"es": "Se ha finalizado la creación de los tesauros",
"fr": "La création des thésaurus est terminée",
"ar": "تم الانتهاء من إنشاء قوائم المرادفات",
"ko": "시소러스 생성이 완료되었습니다."
},
{
"key": "Done extracting files",
"es": "Se ha completado la extracción de los archivos",
"fr": "Extraction des fichiers terminée",
"ar": "تم استخراج الملفات",
"ko": "파일 추출이 완료되었습니다."
},
{
"key": "Done scanning",
"es": "Escaneo finalizado",
"fr": "La numérisation est terminée",
"ar": "انتهى المسح",
"ko": "스캔 완료"
},
{
"key": "Download",
"es": "Descargar",
"fr": "Télécharger",
"ar": "تحميل",
"ko": "다운로드"
},
{
"key": "Download a third-party authenticator app from your mobile store.",
"es": "Descarga una aplicación de autenticación de terceros desde tu tienda de aplicaciones.",
"fr": "Téléchargez une application d'authentification tierce depuis votre boutique d'applications mobile.",
"ar": "قم بتنزيل تطبيق مصادقة تابع لجهة خارجية من متجر التطبيقات على هاتفك المحمول.",
"ko": "모바일 앱 스토어에서 타사 인증 앱을 다운로드하세요."
},
{
"key": "Download all",
"es": "Descargar todo",
"fr": "Tout télécharger",
"ar": "تنزيل الكل",
"ko": "모두 다운로드"
},
{
"key": "Download failed rows",
"es": "Descargar las filas en las que se ha producido un error",
"fr": "Télécharger les lignes en échec",
"ar": "تنزيل الصفوف التي فشل تحميلها",
"ko": "다운로드에 실패한 행"
},
{
"key": "Draft restored from release.",
"es": "Borrador recuperado de la versión publicada.",
"fr": "Brouillon restauré à partir de la version publiée.",
"ar": "تم استعادة المسودة من الإصدار.",
"ko": "릴리스 버전에서 복원된 초안입니다."
},
{
"key": "Drag and drop file in this window to upload",
"es": "Arrastrar y soltar el archivo en esta ventana para subir.",
"fr": "Faites glisser et déposez le fichier dans cette fenêtre pour le télécharger",
"ar": "اسحب الملف وأفلته في هذه النافذة للتحميل",
"ko": "이 창에 파일을 드래그 앤 드롭해 업로드합니다."
},
{
"key": "Drag row",
"es": "Arrastrar fila",
"fr": "Glisser une ligne",
"ar": "سحب الصف",
"ko": "행 드래그"
},
{
"key": "Drop your files here to upload or",
"es": "Suelta los archivos aquí para cargar o",
"fr": "Déposez vos fichiers ici pour les télécharger ou",
"ar": "اسحب ملفاتك هنا للتحميل أو",
"ko": "여기에 파일을 드롭해 업로드합니다."
},
{
"key": "Duplicate values not allowed.",
"es": "No se permiten valores duplicados.",
"fr": "Les valeurs en double ne sont pas autorisées.",
"ar": "لا يُسمح بتكرار القيم.",
"ko": "중복 값은 허용되지 않습니다."
},
{
"key": "Duplicated email",
"es": "Correo electrónico duplicado",
"fr": "Courriel en double",
"ar": "بريد إلكتروني مكرر",
"ko": "이메일 중복"
}
];
