import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home,
  Dumbbell,
  Utensils,
  User,
  Plus,
  X,
  Check,
  Flame,
  ChevronRight,
  ChevronDown,
  Activity,
  AlertCircle,
  RotateCcw,
  Minus,
  ChevronLeft,
  Calendar as CalendarIcon,
  Trash2,
  Loader2,
  Sparkles,
  Target,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Settings,
  Mic,
  Camera,
} from "lucide-react";

const WATER_GOAL = 3000;

const AI_CONFIG = {
  // 引擎A：文本与逻辑大脑 (DeepSeek)
  apiKey: "sk-c90e0bfda0ff4d0f9fd060ce05b0e1e1",
  apiUrl: "https://api.deepseek.com/chat/completions",
  model: "deepseek-chat",
  // 引擎B：视觉识别大脑 (通义千问 Qwen-VL)
  visionApiKey: "sk-4f4cb36b7d5e4d179fe2cf971ab42f30",
  visionApiUrl:
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  visionModel: "qwen-vl-max",
};

const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const getWeekday = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[dateObj.getDay()];
};

const useSpeech = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setSupported(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      if (e.results[0]) {
        const transcript = e.results[0][0].transcript;
        onResult(transcript.replace(/[。，.,]/g, ""));
      }
    };
    recognition.onerror = (e) => {
      console.warn("语音识别错误/取消", e);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (err) {
      console.warn(err);
    }
  };

  return { isListening, supported, startListening };
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const askVisionAI = async (base64Image, promptStr) => {
  if (!AI_CONFIG.visionApiKey) {
    alert("请先配置视觉大模型 API Key！");
    return null;
  }
  try {
    const response = await fetch(AI_CONFIG.visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_CONFIG.visionApiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.visionModel,
        messages: [
          {
            role: "system",
            content:
              "你是一个严苛的视觉健身营养师。请只输出完全合法的 JSON 格式，绝不能包含 markdown 标记或其余废话。",
          },
          {
            role: "user",
            content: [
              { type: "text", text: promptStr },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok)
      throw new Error(`Vision API 请求失败: ${response.status}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("未能找到 JSON 结构");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    alert("视觉识别失败：" + error.message);
    return null;
  }
};

const askAI = async (
  promptStr,
  systemPrompt = "你是一个严谨的 AI 助手。只输出完全合法的 JSON 格式，绝不能包含 markdown 标记或其余废话。"
) => {
  if (!AI_CONFIG.apiKey) {
    alert("请先在代码中配置 API Key！");
    return null;
  }
  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptStr },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("未能找到 JSON 结构");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn("请求失败，启动沙箱模拟器:", error);
    alert("📡 网页沙箱触发了跨域拦截，已为您启动本地模拟数据引擎跑通流程！");

    const text = promptStr;

    // 模拟 AI 配餐返回
    if (text.includes("剩余额度")) {
      const pMatch = text.match(/蛋白质\s*(\d+)g/);
      const cMatch = text.match(/碳水\s*(\d+)g/);
      const fMatch = text.match(/脂肪\s*(\d+)g/);
      const p = pMatch ? Number(pMatch[1]) : 30;
      const c = cMatch ? Number(cMatch[1]) : 20;
      const f = fMatch ? Number(fMatch[1]) : 5;
      return {
        options: [
          {
            planName: "模拟方案：极客快充",
            summary: "分离乳清蛋白+低卡水果",
            totalP: p,
            totalC: c,
            totalF: Math.min(f, 2),
            foodData: {
              id: "ai_meal_mock",
              name: "AI智能配餐-极简",
              type: "combo",
              components: [
                {
                  id: "c1",
                  name: "分离乳清蛋白粉",
                  protein: p,
                  carbs: 2,
                  fat: 0,
                },
                {
                  id: "c2",
                  name: "苹果",
                  protein: 0,
                  carbs: Math.max(c - 2, 0),
                  fat: 0,
                },
              ],
            },
          },
        ],
      };
    }
    if (text.includes("胸") || text.includes("推") || text.includes("夹"))
      return {
        id: "mock_" + Date.now(),
        name: "模拟_胸部训练",
        category: "胸",
        type: "dumbbell",
        MET: 5.0,
      };
    if (text.includes("腿") || text.includes("蹲"))
      return {
        id: "mock_" + Date.now(),
        name: "模拟_腿部训练",
        category: "腿",
        type: "barbell",
        MET: 6.0,
      };
    if (text.includes("撑") || text.includes("静"))
      return {
        id: "mock_" + Date.now(),
        name: "模拟_静力支撑",
        category: "腹",
        type: "isometric",
        MET: 3.0,
      };
    if (
      text.includes("套餐") ||
      text.includes("堡") ||
      text.includes("面") ||
      text.includes("饭") ||
      text.includes("汤")
    ) {
      return {
        type: "combo",
        data: {
          id: "mock_combo_" + Date.now(),
          name: "模拟_中式快餐(智能拆解)",
          components: [
            {
              id: "main",
              name: "主食(米/面)",
              protein: 8,
              carbs: 60,
              fat: 5,
              isRatio: true,
              defaultRatio: 1,
            },
            {
              id: "meat",
              name: "肉类",
              protein: 20,
              carbs: 2,
              fat: 15,
              isRatio: true,
              defaultRatio: 1,
            },
            {
              id: "sauce",
              name: "高脂酱汁/辣油",
              protein: 1,
              carbs: 5,
              fat: 12,
              isToggle: true,
              defaultToggle: true,
            },
          ],
        },
      };
    }
    return {
      type: "single",
      data: {
        id: "mock_food_" + Date.now(),
        name: "模拟_散装食物(100g)",
        unit: "份",
        protein: 10,
        carbs: 20,
        fat: 5,
      },
    };
  }
};

const getComboTotals = (components) => {
  let cal = 0,
    p = 0,
    c = 0,
    f = 0;
  if (!components || !Array.isArray(components))
    return { cal: 0, p: 0, c: 0, f: 0 };
  components.forEach((comp) => {
    const isToggleType = comp.isToggle || !comp.isRatio;
    const isSelected = isToggleType ? comp.selected ?? true : true;
    if (!isSelected) return;
    const r = comp.isRatio ? comp.currentRatio ?? 1 : 1;
    const protein = comp.protein || 0;
    const carbs = comp.carbs || 0;
    const fat = comp.fat || 0;
    const trueCal = protein * 4 + carbs * 4 + fat * 9;
    cal += trueCal * r;
    p += protein * r;
    c += carbs * r;
    f += fat * r;
  });
  return {
    cal: Math.round(cal),
    p: Math.round(p),
    c: Math.round(c),
    f: Math.round(f),
  };
};

const getMacroFeedback = (intake, target, type, isPastDay) => {
  if (target === 0) return { text: "", color: "" };

  let timePhase = "night";
  if (!isPastDay) {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    if (currentTime < 9.0) timePhase = "before_9";
    else if (currentTime < 13.5) timePhase = "before_1330";
    else if (currentTime < 22.0) timePhase = "before_22";
    else timePhase = "night";
  }

  if (type === "P") {
    if (timePhase === "before_9") {
      if (intake < target * 0.1)
        return { text: "(等待吃早餐)", color: "text-gray-400" };
      return { text: "(完美的蛋白质开局)", color: "text-emerald-500" };
    }
    if (timePhase === "before_1330") {
      if (intake === 0)
        return { text: "(🚨 早餐没吃? 缺乏建材)", color: "text-red-500" };
      if (intake < target * 0.3)
        return { text: "(进度略慢, 午餐多补肉)", color: "text-yellow-500" };
      return { text: "(蛋白质进度极佳)", color: "text-blue-500" };
    }
    if (timePhase === "before_22") {
      if (intake < target * 0.3)
        return { text: "(🚨 午餐没吃肉? 肌肉分解中!)", color: "text-red-500" };
      if (intake < target * 0.6)
        return { text: "(进度滞后, 晚餐必须狂补肉)", color: "text-yellow-500" };
      return { text: "(稳步合成肌肉中)", color: "text-emerald-500" };
    }
    if (intake < target * 0.8)
      return { text: "(🚨 严重匮乏! 肌肉分解风险)", color: "text-red-500" };
    if (intake < target)
      return { text: "(🟡 即将达标)", color: "text-yellow-500" };
    return { text: "(🟢 薄肌完美充能)", color: "text-emerald-500" };
  }

  if (type === "C") {
    if (timePhase === "before_9") {
      if (intake < 10)
        return { text: "(早晨空腹低血糖预警)", color: "text-gray-400" };
      if (intake <= target * 0.3)
        return { text: "(优秀的碳水平稳起步)", color: "text-emerald-500" };
      return { text: "(⚠️ 早餐碳水略微偏高)", color: "text-yellow-500" };
    }
    if (timePhase === "before_1330") {
      if (intake === 0)
        return { text: "(🚨 早餐没吃? 极易掉肌肉!)", color: "text-red-500" };
      if (intake < target * 0.4)
        return {
          text: "(平稳状态, 中午可摄入主食)",
          color: "text-emerald-500",
        };
      if (intake <= target * 0.6)
        return { text: "(额度消耗过半, 控主食)", color: "text-yellow-500" };
      return { text: "(⚠️ 超载警告!)", color: "text-red-500" };
    }
    if (timePhase === "before_22") {
      if (intake < target * 0.15)
        return { text: "(🚨 能量断供! 极易糖异生!)", color: "text-red-500" };
      if (intake < target * 0.6)
        return { text: "(优秀: 持续优质供能)", color: "text-emerald-500" };
      if (intake <= target * 0.8)
        return { text: "(触及底线, 晚餐禁主食)", color: "text-yellow-500" };
      return { text: "(🚨 违规超标!)", color: "text-red-500" };
    }
    if (intake < target * 0.4)
      return { text: "(🚨 极低碳水伤代谢, 易掉肌肉!)", color: "text-red-500" };
    if (intake <= target)
      return { text: "(🟢 训练泵感拉满)", color: "text-emerald-500" };
    return { text: "(🚨 违规超标!)", color: "text-red-500" };
  }

  if (type === "F") {
    if (timePhase === "before_9") {
      if (intake < 5) return { text: "(清爽无油)", color: "text-gray-400" };
      return { text: "(⚠️ 早餐略油)", color: "text-yellow-500" };
    }
    if (timePhase === "before_1330") {
      if (intake === 0)
        return { text: "(⚠️ 极度无油, 午餐加全蛋)", color: "text-yellow-500" };
      if (intake < target * 0.4)
        return { text: "(控制完美)", color: "text-emerald-500" };
      return { text: "(🚨 略腻!)", color: "text-red-400" };
    }
    if (timePhase === "before_22") {
      if (intake < target * 0.3)
        return {
          text: "(⚠️ 午餐没油脂? 影响荷尔蒙)",
          color: "text-yellow-500",
        };
      if (intake < target * 0.7)
        return { text: "(控制完美)", color: "text-emerald-500" };
      if (intake <= target * 0.9)
        return { text: "(额度告急, 晚餐清淡)", color: "text-yellow-500" };
      return { text: "(🚨 过腻!)", color: "text-red-500" };
    }
    if (intake < target * 0.4)
      return { text: "(🚨 极低无油! 伤内分泌)", color: "text-red-500" };
    if (intake <= target)
      return { text: "(🟢 荷尔蒙健康运行)", color: "text-emerald-500" };
    return { text: "(🚨 爆表!)", color: "text-red-500" };
  }
};

export default function App() {
  const localTodayStr = getLocalToday();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentDate, setCurrentDate] = useState(localTodayStr);

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("vibeFit_userProfile");
    const parsed = saved ? JSON.parse(saved) : {};
    if (parsed.weight === 75 || parsed.weight === undefined) parsed.weight = 71;
    if (parsed.weekdayDeficit === 800 || parsed.weekdayDeficit === undefined)
      parsed.weekdayDeficit = 400;
    if (parsed.activityLevel === 1.375 || parsed.activityLevel === undefined)
      parsed.activityLevel = 1.2;
    return {
      age: 37,
      height: 183,
      gender: "male",
      weekendDeficit: 0,
      ...parsed,
    };
  });

  const [db, setDb] = useState(() => {
    const saved = localStorage.getItem("vibeFit_customDB");
    return saved
      ? JSON.parse(saved)
      : { workouts: [], foods: { combo: [], single: [], drink: [] } };
  });

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem("vibeFit_records");
    let parsed = saved ? JSON.parse(saved) : {};
    if (!parsed[localTodayStr])
      parsed[localTodayStr] = {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
    return parsed;
  });

  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    const saved = localStorage.getItem("vibeFit_weeklyPlan");
    const defaultPlan = {
      周一: {},
      周二: {},
      周三: {},
      周四: {},
      周五: {},
      周六: {},
      周日: {},
    };
    return saved ? JSON.parse(saved) : defaultPlan;
  });

  useEffect(() => {
    localStorage.setItem("vibeFit_userProfile", JSON.stringify(userProfile));
  }, [userProfile]);
  useEffect(() => {
    localStorage.setItem("vibeFit_records", JSON.stringify(records));
  }, [records]);
  useEffect(() => {
    localStorage.setItem("vibeFit_customDB", JSON.stringify(db));
  }, [db]);
  useEffect(() => {
    localStorage.setItem("vibeFit_weeklyPlan", JSON.stringify(weeklyPlan));
  }, [weeklyPlan]);

  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [editWorkoutData, setEditWorkoutData] = useState(null);

  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [editDietData, setEditDietData] = useState(null);

  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false); // 新增：AI 配餐弹窗状态

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingPlanDay, setEditingPlanDay] = useState(null);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const isPastDay = currentDate < localTodayStr;
  const currentWeekday = getWeekday(currentDate);
  const isWeekend = currentWeekday === "周六" || currentWeekday === "周日";

  const currentRecord = records[currentDate] || {
    workouts: [],
    diet: [],
    water: { basic: 0, coffee: 0 },
  };
  const todayWorkouts = currentRecord.workouts || [];
  const todayDiet = currentRecord.diet || [];
  const waterIntake = currentRecord.water || { basic: 0, coffee: 0 };

  const changeDate = (offset) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d + offset);
    const newDateStr = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    if (newDateStr > localTodayStr) return;
    setCurrentDate(newDateStr);
  };

  const stats = useMemo(() => {
    const { weight, height, age } = userProfile;
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    const tdee = Math.round(bmr * userProfile.activityLevel);

    let workoutCalories = 0;
    todayWorkouts.forEach((w) => (workoutCalories += w.calories || 0));

    let intakeCalories = 0,
      intakeProtein = 0,
      intakeCarbs = 0,
      intakeFat = 0;
    todayDiet.forEach((food) => {
      if (food.type === "single" || food.type === "drink") {
        const protein = food.protein || 0;
        const carbs = food.carbs || 0;
        const fat = food.fat || 0;
        const trueCal = protein * 4 + carbs * 4 + fat * 9;
        intakeCalories += trueCal * (food.quantity || 1);
        intakeProtein += protein * (food.quantity || 1);
        intakeCarbs += carbs * (food.quantity || 1);
        intakeFat += fat * (food.quantity || 1);
      } else {
        const totals = getComboTotals(food.components);
        intakeCalories += totals.cal;
        intakeProtein += totals.p;
        intakeCarbs += totals.c;
        intakeFat += totals.f;
      }
    });

    const currentDeficit = isWeekend
      ? userProfile.weekendDeficit || 0
      : userProfile.weekdayDeficit || 0;
    const goalTDEE = tdee + workoutCalories - currentDeficit;
    const availableCalories = goalTDEE - intakeCalories;

    const targetProtein = 150;
    const targetFat = Math.round(weight * 0.65);
    const remainingCals = goalTDEE - targetProtein * 4 - targetFat * 9;
    const targetCarbs = Math.max(0, Math.round(remainingCals / 4));

    return {
      tdee,
      intakeCalories,
      intakeProtein,
      intakeCarbs,
      intakeFat,
      targetProtein,
      targetCarbs,
      targetFat,
      goalTDEE: Math.round(goalTDEE),
      availableCalories: Math.round(availableCalories),
      workoutCalories,
    };
  }, [userProfile, todayWorkouts, todayDiet, isWeekend]);

  const updateCustomDB = (type, data) => {
    setDb((prev) => {
      const newDb = { ...prev };
      if (type === "workout") {
        if (!newDb.workouts.find((w) => w.id === data.id))
          newDb.workouts.push(data);
      } else if (type === "combo") {
        if (!newDb.foods.combo.find((f) => f.id === data.id))
          newDb.foods.combo.push(data);
      } else if (type === "single") {
        if (!newDb.foods.single.find((f) => f.id === data.id))
          newDb.foods.single.push(data);
      }
      return newDb;
    });
  };

  const adjustWater = (type, amount) => {
    if (isPastDay) return;
    setRecords((prev) => {
      const dayRec = prev[currentDate] || {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
      return {
        ...prev,
        [currentDate]: {
          ...dayRec,
          water: {
            ...dayRec.water,
            [type]: Math.max(0, (dayRec.water[type] || 0) + amount),
          },
        },
      };
    });
  };

  const saveWorkout = (w, editIndex = null) => {
    setRecords((prev) => {
      const dayRec = prev[currentDate] || {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
      const newWorkouts = [...(dayRec.workouts || [])];
      if (editIndex !== null) newWorkouts[editIndex] = w;
      else newWorkouts.push(w);
      return { ...prev, [currentDate]: { ...dayRec, workouts: newWorkouts } };
    });
  };

  const deleteWorkout = (index) => {
    setRecords((prev) => {
      const dayRec = prev[currentDate] || {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
      const newWorkouts = [...(dayRec.workouts || [])];
      newWorkouts.splice(index, 1);
      return { ...prev, [currentDate]: { ...dayRec, workouts: newWorkouts } };
    });
    setIsWorkoutModalOpen(false);
  };

  const saveDiet = (d, editIndex = null) => {
    setRecords((prev) => {
      const dayRec = prev[currentDate] || {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
      let newDiet = [...(dayRec.diet || [])];
      if (editIndex !== null) {
        newDiet[editIndex] = d;
      } else {
        if (d.type === "single" || d.type === "drink") {
          const existIdx = newDiet.findIndex(
            (item) =>
              (item.type === "single" || item.type === "drink") &&
              item.id === d.id
          );
          if (existIdx > -1)
            newDiet[existIdx] = {
              ...newDiet[existIdx],
              quantity: newDiet[existIdx].quantity + d.quantity,
            };
          else newDiet.push(d);
        } else {
          newDiet.push(d);
        }
      }
      return { ...prev, [currentDate]: { ...dayRec, diet: newDiet } };
    });
  };

  const saveDrink = (d) => {
    saveDiet(d);
    if (d.volume && !isPastDay) {
      adjustWater("basic", d.volume * (d.quantity || 1));
    }
  };

  const deleteDiet = (index) => {
    setRecords((prev) => {
      const dayRec = prev[currentDate] || {
        workouts: [],
        diet: [],
        water: { basic: 0, coffee: 0 },
      };
      let newDiet = [...(dayRec.diet || [])];
      newDiet.splice(index, 1);
      return { ...prev, [currentDate]: { ...dayRec, diet: newDiet } };
    });
    setIsDietModalOpen(false);
  };

  const savePlanDay = (day, exercises) => {
    setWeeklyPlan((prev) => ({ ...prev, [day]: { exercises } }));
    setEditingPlanDay(null);
  };

  const appendToPlan = async (ex) => {
    const placeholderEx = { ...ex, cues: "AI 正在生成专属发力口诀..." };
    setWeeklyPlan((prev) => {
      const dayPlan = prev[currentWeekday] || {};
      const exercises = dayPlan.exercises || [];
      if (exercises.find((e) => e.id === ex.id)) return prev;
      return {
        ...prev,
        [currentWeekday]: {
          ...dayPlan,
          exercises: [...exercises, placeholderEx],
        },
      };
    });

    const promptStr = `作为顶级解剖学和力量举大师，请给出动作【${ex.name}】的绝对核心发力要点。\n要求：\n1. 语言必须极简硬核，直击要害。\n2. 最多 3 点，每点不超过 8 个字。\n3. 返回 JSON 格式：{"cues": "1. 核心收紧\\n2. 臀部后推\\n3. 小腿垂直地面"}`;
    const res = await askAI(promptStr);
    const finalCues = res?.cues || "暂无提示，注意安全感受发力";

    setWeeklyPlan((prev) => {
      const dayPlan = prev[currentWeekday];
      if (!dayPlan) return prev;
      const updatedExercises = dayPlan.exercises.map((e) =>
        e.id === ex.id ? { ...e, cues: finalCues } : e
      );
      return {
        ...prev,
        [currentWeekday]: { ...dayPlan, exercises: updatedExercises },
      };
    });
  };

  const openWorkoutEdit = (idx, data) => {
    if (isPastDay) return;
    setEditWorkoutData({ index: idx, data });
    setIsWorkoutModalOpen(true);
  };
  const openDietEdit = (idx, data) => {
    if (isPastDay) return;
    setEditDietData({ index: idx, data });
    setIsDietModalOpen(true);
  };

  const TabIcon = ({ icon: Icon, label, tabName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
        activeTab === tabName ? "text-indigo-600" : "text-gray-400"
      }`}
    >
      <Icon size={24} strokeWidth={activeTab === tabName ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  const pFeedback = getMacroFeedback(
    stats.intakeProtein,
    stats.targetProtein,
    "P",
    isPastDay
  );
  const cFeedback = getMacroFeedback(
    stats.intakeCarbs,
    stats.targetCarbs,
    "C",
    isPastDay
  );
  const fFeedback = getMacroFeedback(
    stats.intakeFat,
    stats.targetFat,
    "F",
    isPastDay
  );

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col font-sans relative shadow-2xl sm:border-x sm:border-gray-200">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 sticky top-0">
        <div
          className={`flex justify-between items-center ${
            activeTab !== "profile" ? "mb-4" : ""
          }`}
        >
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            {activeTab === "dashboard" && (isPastDay ? "历史汇总" : "今日看板")}
            {activeTab === "workout" && (isPastDay ? "训练历史" : "训练打卡")}
            {activeTab === "diet" && (isPastDay ? "饮食历史" : "饮食打卡")}
            {activeTab === "profile" && "身体数据"}
          </h1>
          {activeTab === "dashboard" && !isPastDay && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                isWeekend
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-900 text-white"
              }`}
            >
              {isWeekend ? "周末放纵模式" : "极客燃脂模式"}
            </span>
          )}
        </div>

        {activeTab !== "profile" && (
          <div className="flex justify-between items-center bg-gray-50 rounded-xl p-1 shadow-inner border border-gray-100">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="flex items-center space-x-2 text-sm font-bold text-gray-700 tracking-wide hover:text-indigo-600 transition-colors py-2 px-4 rounded-lg active:bg-gray-200"
            >
              <CalendarIcon size={16} className="text-indigo-500" />
              <span>
                {currentDate === localTodayStr ? "今天 " : ""}
                {currentDate} {currentWeekday}
              </span>
            </button>
            <button
              onClick={() => changeDate(1)}
              disabled={currentDate >= localTodayStr}
              className={`p-2 rounded-lg transition-all ${
                currentDate >= localTodayStr
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-white shadow-sm"
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-36 scrollbar-hide">
        {activeTab === "dashboard" && (
          <div className="p-6 space-y-6">
            <div
              className={`rounded-3xl p-6 text-white shadow-lg ${
                isWeekend
                  ? "bg-gradient-to-br from-blue-500 to-sky-400"
                  : "bg-gradient-to-br from-gray-900 to-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-white/80 text-sm font-medium flex items-center">
                    <Target size={14} className="mr-1" />{" "}
                    {isPastDay ? "饮食剩余额度" : "今日剩余饮食额度"} (kcal)
                  </p>
                  <p
                    className={`text-4xl font-bold mt-1 ${
                      stats.availableCalories >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {stats.availableCalories > 0 ? "+" : ""}
                    {stats.availableCalories}
                  </p>
                </div>
                <Flame size={28} className="opacity-80" />
              </div>
              <div className="bg-white/10 rounded-2xl p-4 mb-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/80">饮食上限目标</span>
                  <span className="font-bold text-[16px]">
                    {stats.goalTDEE} kcal
                  </span>
                </div>
                <div className="flex justify-between text-white/60 text-[10px]">
                  <span className="">
                    (工作日目标缺口 {userProfile.weekdayDeficit} kcal，周末{" "}
                    {userProfile.weekendDeficit} kcal)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-white/80">总摄入</p>
                  <p className="font-semibold text-lg">
                    {Math.round(stats.intakeCalories)}{" "}
                    <span className="text-xs font-normal">kcal</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/80">日常总消耗</p>
                  <p className="font-semibold text-lg">
                    {stats.tdee + stats.workoutCalories}{" "}
                    <span className="text-xs font-normal">kcal</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-end mb-5">
                <h3 className="text-lg font-bold text-gray-800">
                  {isPastDay ? "宏量营养素复盘" : "今日营养数据"}
                </h3>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex flex-col text-sm font-black text-gray-800 mb-2">
                    <div className="flex justify-between">
                      <span>蛋白质 (P)</span>
                      <span>
                        {Math.round(stats.intakeProtein)} /{" "}
                        {stats.targetProtein} g
                      </span>
                    </div>
                    <span
                      className={`text-xs mt-1 leading-relaxed ${pFeedback.color}`}
                    >
                      {pFeedback.text}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-emerald-500`}
                      style={{
                        width: `${Math.min(
                          (stats.intakeProtein / stats.targetProtein) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col text-sm font-black text-gray-800 mb-2">
                    <div className="flex justify-between">
                      <span>碳水化合物 (C)</span>
                      <span>
                        {Math.round(stats.intakeCarbs)}{" "}
                        {isWeekend ? "" : `/ ${stats.targetCarbs} g`}
                      </span>
                    </div>
                    <span
                      className={`text-xs mt-1 leading-relaxed ${cFeedback.color}`}
                    >
                      {cFeedback.text}
                    </span>
                  </div>
                  {!isWeekend && (
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.intakeCarbs > stats.targetCarbs
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (stats.intakeCarbs / stats.targetCarbs) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-col text-sm font-black text-gray-800 mb-2">
                    <div className="flex justify-between">
                      <span>脂肪 (F)</span>
                      <span>
                        {Math.round(stats.intakeFat)}{" "}
                        {isWeekend ? "" : `/ ${stats.targetFat} g`}
                      </span>
                    </div>
                    <span
                      className={`text-xs mt-1 leading-relaxed ${fFeedback.color}`}
                    >
                      {fFeedback.text}
                    </span>
                  </div>
                  {!isWeekend && (
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.intakeFat > stats.targetFat
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (stats.intakeFat / stats.targetFat) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden select-none">
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <span className="bg-gray-900 text-white text-xs font-black px-5 py-2.5 rounded-full shadow-xl flex items-center transition-transform hover:scale-105 cursor-default">
                  <Sparkles size={14} className="mr-2 text-emerald-400" />
                  AI 高阶数据统计 · 敬请期待
                </span>
              </div>
              <div className="opacity-30 filter grayscale">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Activity size={18} className="mr-2 text-indigo-500" />
                    体重与代谢趋势
                  </h3>
                </div>
                <div className="flex items-end justify-between h-20 gap-2 mt-4">
                  {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="w-full bg-indigo-100 rounded-t-lg"
                      style={{ height: `${h}%` }}
                    >
                      <div
                        className="w-full bg-indigo-500 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(10, h - 20)}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === "diet" && (
          <div className="p-6">
            {!isPastDay && (
              <div className="mb-8 bg-blue-50 rounded-3xl p-5 border border-blue-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-blue-900">
                    补水追踪 (3L)
                  </h3>
                  <span className="text-xs font-bold text-blue-600">
                    {waterIntake.basic + waterIntake.coffee} ml
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-blue-500 transition-all`}
                    style={{
                      width: `${Math.min(
                        ((waterIntake.basic + waterIntake.coffee) /
                          WATER_GOAL) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => adjustWater("basic", 300)}
                    className="flex-1 bg-blue-500 text-white h-12 rounded-2xl text-[16px] font-black shadow-sm active:scale-95 transition-transform"
                  >
                    +300ml 纯水
                  </button>
                  <button
                    onClick={() => adjustWater("coffee", 100)}
                    className="flex-1 bg-amber-700 text-white h-12 rounded-2xl text-[16px] font-black shadow-sm active:scale-95 transition-transform"
                  >
                    +100ml 冰美式
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {isPastDay ? "当日摄入明细" : "今日摄入明细"}
              </h3>
              {!isPastDay && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsAiPlannerOpen(true)}
                    className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <Sparkles size={14} className="inline mr-1" />
                    AI 配餐
                  </button>
                  <button
                    onClick={() => setIsDrinkModalOpen(true)}
                    className="bg-sky-100 text-sky-700 px-3 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <Plus size={14} className="inline mr-1" />
                    饮品
                  </button>
                  <button
                    onClick={() => {
                      setEditDietData(null);
                      setIsDietModalOpen(true);
                    }}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center shadow-md active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <Plus size={14} className="mr-1" />
                    录入
                  </button>
                </div>
              )}
            </div>

            {todayDiet.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-[16px] bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                该日期暂无饮食记录
              </div>
            ) : (
              <div className="space-y-4">
                {todayDiet.map((food, idx) => {
                  let totalCal = 0,
                    totalP = 0,
                    totalC = 0,
                    totalF = 0;
                  if (food.type === "single" || food.type === "drink") {
                    const protein = food.protein || 0;
                    const carbs = food.carbs || 0;
                    const fat = food.fat || 0;
                    const trueCal = protein * 4 + carbs * 4 + fat * 9;
                    totalCal = Math.round(trueCal * (food.quantity || 1));
                    totalP = protein * (food.quantity || 1);
                    totalC = carbs * (food.quantity || 1);
                    totalF = fat * (food.quantity || 1);
                  } else {
                    const t = getComboTotals(food.components || []);
                    totalCal = t.cal;
                    totalP = t.p;
                    totalC = t.c;
                    totalF = t.f;
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isPastDay) {
                          if (food.type === "drink") setIsDrinkModalOpen(true);
                          else openDietEdit(idx, food);
                        }
                      }}
                      className={`bg-white p-5 rounded-3xl shadow-sm border border-gray-100 ${
                        !isPastDay
                          ? "cursor-pointer active:scale-[0.98] transition-transform hover:border-indigo-200"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-end mb-3 border-b border-gray-50 pb-2">
                        <span className="font-black text-gray-800 text-[16px]">
                          {food.name}{" "}
                          {food.type === "single" || food.type === "drink" ? (
                            <span className="text-indigo-600 text-sm ml-1">
                              x{food.quantity}
                              {food.unit}
                            </span>
                          ) : (
                            ""
                          )}
                        </span>
                        <div className="text-right">
                          <span className="block font-black text-indigo-600 text-[16px]">
                            {totalCal} kcal
                          </span>
                          <span className="text-[10px] text-gray-400">
                            蛋白:{totalP.toFixed(1)}g 碳水:{totalC.toFixed(1)}g
                            脂肪:{totalF.toFixed(1)}g
                          </span>
                        </div>
                      </div>
                      {food.type === "combo" &&
                        food.components &&
                        Array.isArray(food.components) && (
                          <div className="space-y-2">
                            {food.components.map((comp, ci) => {
                              const isToggleType =
                                comp.isToggle || !comp.isRatio;
                              if (isToggleType && !(comp.selected ?? true))
                                return null;
                              const ratio = comp.isRatio
                                ? comp.currentRatio ?? 1
                                : 1;
                              if (ratio === 0) return null;
                              const compCal =
                                ((comp.protein || 0) * 4 +
                                  (comp.carbs || 0) * 4 +
                                  (comp.fat || 0) * 9) *
                                ratio;
                              return (
                                <div
                                  key={ci}
                                  className="flex justify-between items-center text-[12px] text-gray-500"
                                >
                                  <span>
                                    - {comp.name}{" "}
                                    {comp.isRatio &&
                                      `(${(ratio * 100).toFixed(0)}%)`}
                                  </span>
                                  <span className="font-medium text-gray-600">
                                    {Math.round(compCal)} kcal
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {}
        {activeTab === "workout" && (
          <div className="p-6">
            {(weeklyPlan[currentWeekday]?.exercises?.length > 0 ||
              todayWorkouts.length > 0) &&
              !isPastDay && (
                <div className="mb-8 bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={80} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-emerald-400 mb-1 tracking-widest uppercase flex items-center">
                      <Target size={14} className="mr-1" /> 今日专属计划
                    </p>
                    <h3 className="text-2xl font-black text-white mb-5">
                      {currentWeekday} 专属计划
                    </h3>

                    {weeklyPlan[currentWeekday]?.exercises?.length > 0 ? (
                      <div className="space-y-3">
                        {weeklyPlan[currentWeekday].exercises.map(
                          (planEx, idx) => {
                            const doneIdx = todayWorkouts.findIndex(
                              (w) => w.id === planEx.id
                            );
                            const isDone = doneIdx > -1;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (isPastDay) return;
                                  if (isDone)
                                    openWorkoutEdit(
                                      doneIdx,
                                      todayWorkouts[doneIdx]
                                    );
                                  else {
                                    setEditWorkoutData(null);
                                    setIsWorkoutModalOpen({ prefill: planEx });
                                  }
                                }}
                                className={`p-4 rounded-2xl transition-all ${
                                  isDone
                                    ? "bg-white/10 border border-white/5 opacity-60 cursor-pointer hover:opacity-80"
                                    : "bg-white border border-transparent cursor-pointer hover:scale-[1.02] shadow-lg"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center">
                                    {isDone ? (
                                      <CheckCircle2
                                        size={18}
                                        className="text-emerald-400 mr-2"
                                      />
                                    ) : (
                                      <Circle
                                        size={18}
                                        className="text-gray-300 mr-2"
                                      />
                                    )}
                                    <span
                                      className={`font-bold ${
                                        isDone
                                          ? "text-white line-through opacity-70"
                                          : "text-gray-900"
                                      } text-[16px]`}
                                    >
                                      {planEx.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      isDone
                                        ? "bg-white/10 text-white/60"
                                        : "bg-indigo-50 text-indigo-600"
                                    }`}
                                  >
                                    {planEx.category}
                                  </span>
                                </div>
                                {planEx.cues && !isDone && (
                                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                                    <p className="text-[12px] font-bold text-amber-800 leading-relaxed break-words whitespace-pre-wrap">
                                      <Sparkles
                                        size={12}
                                        className="inline mr-1 mb-0.5 text-amber-500"
                                      />
                                      {planEx.cues}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="text-white/50 text-[12px]">
                        今日暂无计划，可直接下方记录，或去「我的」排表。
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {isPastDay ? "当日训练记录" : "当日动作明细"}
              </h3>
              {!isPastDay && (
                <button
                  onClick={() => {
                    setEditWorkoutData(null);
                    setIsWorkoutModalOpen(true);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-md active:scale-95 transition-transform"
                >
                  <Plus size={16} className="mr-1" /> 自主记录
                </button>
              )}
            </div>

            {todayWorkouts.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-[16px] bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                暂无训练数据
              </div>
            ) : (
              <div className="space-y-4">
                {todayWorkouts.map((w, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isPastDay && openWorkoutEdit(idx, w)}
                    className={`bg-white p-5 rounded-3xl border border-gray-100 flex flex-col shadow-sm ${
                      !isPastDay
                        ? "cursor-pointer active:scale-[0.98] transition-transform hover:border-indigo-200"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {w.category}
                          </span>
                          <h4 className="font-bold text-gray-800 text-[16px]">
                            {w.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wide">
                          {w.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-indigo-600 block">
                          {w.calories} kcal
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Total: {w.totalVolume} kg
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {w.setsList &&
                        w.setsList.map((set, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex justify-between text-[12px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg"
                          >
                            <span>第 {sIdx + 1} 组</span>
                            <span className="font-bold text-gray-700">
                              {w.type === "isometric"
                                ? `${set.actualWeight}kg × ${set.reps}秒`
                                : `${set.actualWeight}kg × ${set.reps}次`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {}
        {activeTab === "profile" && (
          <div className="p-6 space-y-6">
            <div className="bg-gray-900 p-6 rounded-3xl shadow-lg border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center">
                <Target size={20} className="mr-2 text-emerald-400" />
                🔥 私人训练计划排表
              </h3>
              <p className="text-[10px] text-gray-400 mb-4">
                设定每日训练排表，AI 自动为你生成核心发力口诀。
              </p>

              <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
                  (day) => (
                    <div
                      key={day}
                      onClick={() => setEditingPlanDay(day)}
                      className="snap-start shrink-0 w-28 bg-white/10 rounded-2xl p-4 border border-white/5 cursor-pointer active:scale-95 transition-transform hover:bg-white/20"
                    >
                      <p className="text-xs font-bold text-gray-400 mb-1">
                        {day}
                      </p>
                      <p className="text-[16px] font-black text-white truncate">
                        {weeklyPlan[day]?.exercises?.length > 0
                          ? "查看 / 编辑"
                          : "点击排表"}
                      </p>
                      {weeklyPlan[day]?.exercises?.length > 0 && (
                        <p className="text-[10px] text-emerald-400 mt-2">
                          {weeklyPlan[day].exercises.length} 个动作
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 transition-all">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
              >
                <h3 className="text-[15px] font-bold text-gray-800 flex items-center">
                  <Settings size={18} className="mr-2 text-indigo-500" />
                  身体与热量引擎配置
                </h3>
                {isProfileExpanded ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </div>

              {!isProfileExpanded ? (
                <div
                  className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500 cursor-pointer"
                  onClick={() => setIsProfileExpanded(true)}
                >
                  <span className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    {userProfile.height}cm / {userProfile.weight}kg /{" "}
                    {userProfile.age}岁
                  </span>
                  <span className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    活动系数: {userProfile.activityLevel}
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-lg">
                    缺口: {userProfile.weekdayDeficit} /{" "}
                    {userProfile.weekendDeficit}
                  </span>
                </div>
              ) : (
                <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 border-t border-gray-50 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                        身高(cm)
                      </label>
                      <input
                        type="number"
                        value={
                          userProfile.height === 0 ? "" : userProfile.height
                        }
                        onChange={(e) =>
                          setUserProfile({
                            ...userProfile,
                            height:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-gray-800 font-bold text-[16px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                        体重(kg)
                      </label>
                      <input
                        type="number"
                        value={
                          userProfile.weight === 0 ? "" : userProfile.weight
                        }
                        onChange={(e) =>
                          setUserProfile({
                            ...userProfile,
                            weight:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-gray-800 font-bold text-[16px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                        年龄
                      </label>
                      <input
                        type="number"
                        value={userProfile.age === 0 ? "" : userProfile.age}
                        onChange={(e) =>
                          setUserProfile({
                            ...userProfile,
                            age:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-gray-800 font-bold text-[16px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      生活活动系数 (不含健身)
                    </label>
                    <select
                      value={userProfile.activityLevel}
                      onChange={(e) =>
                        setUserProfile({
                          ...userProfile,
                          activityLevel: Number(e.target.value),
                        })
                      }
                      className="w-full bg-gray-50 border-none rounded-xl p-2.5 text-gray-800 font-bold text-[16px]"
                    >
                      <option value={1.2}>1.2 极少走动 (白领/居家)</option>
                      <option value={1.375}>1.375 轻度走动 (教师/销售)</option>
                      <option value={1.55}>1.55 中度体力 (服务业)</option>
                      <option value={1.725}>1.725 重度体力 (搬运劳动)</option>
                    </select>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-50">
                    <label className="block text-[11px] font-bold text-indigo-900 mb-2">
                      🔥 动态热量缺口目标 (kcal)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-400 mb-1">
                          工作日缺口
                        </label>
                        <input
                          type="number"
                          value={
                            userProfile.weekdayDeficit === 0
                              ? ""
                              : userProfile.weekdayDeficit
                          }
                          onChange={(e) =>
                            setUserProfile({
                              ...userProfile,
                              weekdayDeficit:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-indigo-100 rounded-xl p-2 text-indigo-900 font-bold text-[16px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-400 mb-1">
                          周末缺口
                        </label>
                        <input
                          type="number"
                          value={
                            userProfile.weekendDeficit === 0
                              ? ""
                              : userProfile.weekendDeficit
                          }
                          onChange={(e) =>
                            setUserProfile({
                              ...userProfile,
                              weekendDeficit:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full bg-white border border-indigo-100 rounded-xl p-2 text-indigo-900 font-bold text-[16px]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsProfileExpanded(false)}
                    className="w-full mt-2 bg-indigo-600 text-white h-12 rounded-xl font-black shadow-lg active:scale-95 transition-transform flex items-center justify-center text-[16px]"
                  >
                    <CheckCircle2 size={18} className="mr-2" />{" "}
                    保存并重新核算引擎
                  </button>
                </div>
              )}
            </div>

            <div className="bg-indigo-900 p-6 rounded-3xl shadow-lg border border-indigo-800 text-white mt-6">
              <h3 className="text-lg font-bold mb-5 flex items-center text-indigo-200">
                <Activity size={20} className="mr-2" />
                极客底层算法说明
              </h3>
              <div className="space-y-4 text-xs font-medium text-indigo-100">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-emerald-300 font-bold mb-1 flex items-center">
                    <Zap size={14} className="mr-1" />
                    训练消耗 (METs 运动医学标准)
                  </p>
                  <p className="opacity-90 leading-relaxed mb-2">
                    系统由本地接管物理运算，杜绝AI幻觉：
                  </p>
                  <p className="font-mono mt-1 text-white bg-black/30 p-2.5 rounded-lg shadow-inner text-[11px]">
                    消耗 = MET(代谢当量) × 体重(kg) × 时长(h)
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl">
                  <p className="text-blue-300 font-bold mb-1 flex items-center">
                    <ShieldCheck size={14} className="mr-1" />
                    饮食计算 (能量守恒定律)
                  </p>
                  <p className="opacity-90 leading-relaxed mb-2">
                    所有餐食的总热量由其三大营养素物理锁死：
                  </p>
                  <p className="font-mono mt-1 text-white bg-black/30 p-2.5 rounded-lg shadow-inner text-[11px]">
                    热量 = (蛋白+碳水)×4 + 脂肪×9
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-4 right-4 bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl h-16 flex justify-around items-center z-50 border border-gray-100">
        <TabIcon icon={Home} label="看板" tabName="dashboard" />
        <TabIcon icon={Dumbbell} label="训练" tabName="workout" />
        <TabIcon icon={Utensils} label="饮食" tabName="diet" />
        <TabIcon icon={User} label="我的" tabName="profile" />
      </div>

      {isWorkoutModalOpen && !isPastDay && (
        <AddWorkoutModal
          editData={editWorkoutData}
          prefillData={isWorkoutModalOpen.prefill}
          userWeight={userProfile.weight}
          onClose={() => setIsWorkoutModalOpen(false)}
          onAdd={saveWorkout}
          onDelete={deleteWorkout}
          onAppendToPlan={appendToPlan}
        />
      )}
      {isDietModalOpen && !isPastDay && (
        <AddDietModal
          editData={editDietData}
          db={db.foods}
          updateDB={updateCustomDB}
          onClose={() => setIsDietModalOpen(false)}
          onAdd={saveDiet}
          onDelete={deleteDiet}
        />
      )}
      {isDrinkModalOpen && !isPastDay && (
        <AddDrinkModal
          onClose={() => setIsDrinkModalOpen(false)}
          onAdd={saveDrink}
        />
      )}
      {isAiPlannerOpen && !isPastDay && (
        <AiMealPlannerModal
          stats={stats}
          onClose={() => setIsAiPlannerOpen(false)}
          onAdd={saveDiet}
        />
      )}
      {isCalendarOpen && (
        <CalendarModal
          onClose={() => setIsCalendarOpen(false)}
          currentDate={currentDate}
          onSelectDate={(newDate) => {
            setCurrentDate(newDate);
            setIsCalendarOpen(false);
          }}
          records={records}
          localTodayStr={localTodayStr}
        />
      )}
      {editingPlanDay && (
        <PlanEditModal
          day={editingPlanDay}
          currentPlan={weeklyPlan[editingPlanDay]}
          dbWorkouts={db.workouts}
          onClose={() => setEditingPlanDay(null)}
          onSave={savePlanDay}
          updateDB={updateCustomDB}
        />
      )}
    </div>
  );
}

function AiMealPlannerModal({ stats, onClose, onAdd }) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const remP = Math.max(
    0,
    Math.round(stats.targetProtein - stats.intakeProtein)
  );
  const remC = Math.max(0, Math.round(stats.targetCarbs - stats.intakeCarbs));
  const remF = Math.max(0, Math.round(stats.targetFat - stats.intakeFat));
  const isZero = remP === 0 && remC === 0 && remF === 0;

  const generatePlans = async () => {
    setIsLoading(true);
    const promptStr = `作为顶级健身营养师，用户今天的宏量营养素剩余额度为：
蛋白质 ${remP}g，碳水 ${remC}g，脂肪 ${remF}g。
请利用现实中常见、易获取的自然食物或基础补剂（如蛋白粉），搭配出 3 套填缝方案。

【绝对红线指令】：
1. 拒绝数学游戏，回归真实：必须严格使用食物真实的宏量营养素数据！绝对不准为了强行凑出 100% 匹配的数字而伪造食物属性。
2. 真实误差允许：自然食物不可能完美拼凑。总蛋白允许 ±5g 的合理误差；碳水和脂肪【宁缺毋滥】（绝不能超过剩余额度上限，低于上限即可，0脂肪必须老老实实用纯净补剂或纯蛋清）。
3. 拒绝反人类克数：重量必须符合生活常识（如 100g、150g、200g鸡肉，1个苹果，1勺或1.5勺蛋白粉），绝对禁止出现“112.5g”这种为了凑数学题的荒谬重量。
4. 必须输出纯净 JSON，不要 Markdown。

输出格式严格遵守以下 JSON 结构：
{
  "options": [
    {
      "planName": "方案A：极客生拼",
      "summary": "2勺蛋白粉 + 1个中等苹果",
      "totalP": 50, "totalC": 20, "totalF": 0,
      "foodData": {
        "id": "ai_plan_xxx",
        "name": "AI配餐：极客生拼",
        "type": "combo",
        "components": [
           { "id": "comp1", "name": "ISO100蛋白粉(2勺)", "protein": 50, "carbs": 4, "fat": 1, "isRatio": false, "isToggle": true, "selected": true, "defaultToggle": true },
           { "id": "comp2", "name": "苹果(中等)", "protein": 0, "carbs": 16, "fat": 0, "isRatio": false, "isToggle": true, "selected": true, "defaultToggle": true }
        ]
      }
    }
  ]
}`;

    const res = await askAI(
      promptStr,
      "你是一个严苛的 AI 营养师，只输出符合预期的完全合法的 JSON。"
    );
    setIsLoading(false);
    if (res && res.options) {
      // 防呆兜底
      res.options.forEach((opt) => {
        if (opt.foodData && opt.foodData.components) {
          opt.foodData.components.forEach((c) => {
            c.selected = true;
            c.currentRatio = 1;
            c.isToggle = true;
            c.isRatio = false;
          });
        }
      });
      setOptions(res.options);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full max-h-[85vh] flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="font-bold text-xl flex items-center">
            <Sparkles className="mr-2 text-emerald-500" size={20} /> AI 智能配餐
          </h3>
          <X
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-800 transition-colors"
          />
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-hide">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mb-6 shadow-inner">
            <p className="text-emerald-800 text-[12px] font-bold mb-2">
              您的当前剩余营养额度 (缺口填充)：
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <span className="block text-[10px] text-gray-400">蛋白质</span>
                <span
                  className={`font-black text-[16px] ${
                    remP > 0 ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {remP}g
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <span className="block text-[10px] text-gray-400">碳水</span>
                <span
                  className={`font-black text-[16px] ${
                    remC > 0 ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {remC}g
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <span className="block text-[10px] text-gray-400">脂肪</span>
                <span
                  className={`font-black text-[16px] ${
                    remF > 0 ? "text-yellow-600" : "text-gray-400"
                  }`}
                >
                  {remF}g
                </span>
              </div>
            </div>
          </div>

          {isZero ? (
            <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <CheckCircle2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-bold text-sm">
                今日三大营养素已完全达标
              </p>
              <p className="text-gray-400 text-xs mt-1">
                系统已安全锁定，无需再强行进食。
              </p>
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-10">
              <button
                onClick={generatePlans}
                disabled={isLoading}
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-transform flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    正在基于真实数据演算...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" /> 开始生成科学填缝方案
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-400 mt-4 px-4 leading-relaxed">
                系统已开启反幻觉机制。AI
                将基于真实食物常量搭配，不再捏造完美的假数据，允许出现符合现实的几克合理误差。
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="bg-gray-50 p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:border-emerald-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-emerald-900 text-[16px]">
                        {opt.planName}
                      </h4>
                      <p className="text-[11px] text-emerald-600 font-bold mt-1 bg-emerald-100/50 px-2 py-0.5 rounded-md inline-block">
                        {opt.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onAdd(opt.foodData);
                        onClose();
                      }}
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform"
                    >
                      一键采用
                    </button>
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-gray-200 pt-3">
                    {opt.foodData?.components?.map((c, idx) => (
                      <p
                        key={idx}
                        className="text-[12px] text-gray-600 flex justify-between"
                      >
                        <span className="font-medium">- {c.name}</span>
                        <span className="text-gray-400 text-[10px]">
                          P:{c.protein} C:{c.carbs} F:{c.fat}
                        </span>
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2 text-[10px] text-gray-400 font-bold">
                    <span
                      className={opt.totalP > remP + 5 ? "text-red-400" : ""}
                    >
                      总蛋白: {opt.totalP}g
                    </span>
                    <span
                      className={opt.totalC > remC + 5 ? "text-red-400" : ""}
                    >
                      总碳水: {opt.totalC}g
                    </span>
                    <span
                      className={opt.totalF > remF + 3 ? "text-red-400" : ""}
                    >
                      总脂肪: {opt.totalF}g
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={generatePlans}
                disabled={isLoading}
                className="w-full py-3 mt-2 text-emerald-600 bg-emerald-50 rounded-xl text-[12px] font-bold active:scale-95 transition-transform flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <RotateCcw size={14} className="mr-2" />
                )}{" "}
                重新生成一批
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanEditModal({
  day,
  currentPlan,
  dbWorkouts,
  onClose,
  onSave,
  updateDB,
}) {
  const [exercises, setExercises] = useState(currentPlan?.exercises || []);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const {
    isListening,
    supported: speechSupported,
    startListening,
  } = useSpeech((text) => setAiPrompt((prev) => prev + text));

  const handleAIGenerate = async (promptText) => {
    const text = promptText || aiPrompt;
    if (!text) return;
    setIsAiLoading(true);
    const promptStr = `作为资深运动医学专家，将动作精准归类并提供MET值，同时提炼核心发力要点。
    严格JSON格式：
    1. "category": ["胸", "背", "肩", "腿", "腹", "手臂", "有氧"]
    2. "type": ["barbell", "dumbbell", "machine", "bodyweight", "assisted", "cardio", "kettlebell", "smith", "isometric"]
    3. "MET": 中等强度代谢当量(如 5.0, 3.5, 8.0, 支撑类如平板支撑2.5)
    4. "id": 英文/拼音
    5. "name": 规范化的中文动作名称
    6. "cues": 3句极简硬核发力口诀，带换行符\\n

    输入：【${text}】`;

    const result = await askAI(promptStr);
    setIsAiLoading(false);
    if (result) {
      const newEx = {
        ...result,
        name: result.name || text,
        cues: result.cues || "注意安全感受发力",
      };
      setExercises([...exercises, newEx]);
      updateDB("workout", newEx);
      setAiPrompt("");
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="font-bold text-xl">配置 {day} 计划</h3>
          <X onClick={onClose} className="cursor-pointer text-gray-400" />
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide space-y-4">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100"
            >
              <div>
                <h4 className="font-bold text-gray-800 text-[16px]">
                  {ex.name}
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">
                  {ex.category} | {ex.type}
                </p>
              </div>
              <button
                onClick={() => {
                  const nx = [...exercises];
                  nx.splice(idx, 1);
                  setExercises(nx);
                }}
                className="text-red-400 p-2 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-400 mb-2">
              智能添加新动作到本计划
            </p>
            <div className="flex bg-gray-900 border border-gray-800 rounded-2xl p-1 shadow-inner items-center transition-all">
              {speechSupported && (
                <button
                  onClick={isListening ? null : startListening}
                  className={`p-3 ${
                    isListening
                      ? "text-red-500 animate-pulse"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <Mic size={20} />
                </button>
              )}
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={
                  isListening ? "正在聆听..." : "文字或语音输入动作..."
                }
                className="flex-1 w-full bg-transparent px-1 py-4 text-[16px] font-bold text-white border-none focus:ring-0 outline-none placeholder-gray-600"
                onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
              />
              <button
                onClick={() => handleAIGenerate()}
                disabled={isAiLoading || !aiPrompt}
                className={`px-5 py-4 rounded-xl text-sm font-black transition-all flex items-center ${
                  isAiLoading || !aiPrompt
                    ? "bg-gray-800 text-gray-600"
                    : "bg-emerald-500 text-white shadow-md"
                }`}
              >
                {isAiLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "添加"
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 shrink-0">
          <button
            onClick={() => onSave(day, exercises)}
            className="w-full bg-gray-900 text-white h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-transform text-[16px]"
          >
            保存 {day} 计划
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWorkoutModal({
  editData,
  prefillData,
  userWeight,
  onClose,
  onAdd,
  onDelete,
  onAppendToPlan,
}) {
  const isEditing = !!editData;
  const initData = isEditing ? editData.data : prefillData || null;

  const [selectedEx, setSelectedEx] = useState(initData);
  const [setsList, setSetsList] = useState(
    initData?.setsList || [
      { inputWeight: initData?.type === "isometric" ? 0 : "", reps: "" },
    ]
  );
  const [duration, setDuration] = useState(initData?.duration || "");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [addToPlan, setAddToPlan] = useState(false);
  const {
    isListening,
    supported: speechSupported,
    startListening,
  } = useSpeech((text) => setAiPrompt((prev) => prev + text));

  const handleAIGenerate = async (promptText) => {
    const text = promptText || aiPrompt;
    if (!text) return;
    setIsAiLoading(true);
    const promptStr = `作为资深运动医学专家，将动作精准归类并提供MET值。严格JSON格式。
    1. "category": ["胸", "背", "肩", "腿", "腹", "手臂", "有氧"]
    2. "type": ["barbell", "dumbbell", "machine", "bodyweight", "assisted", "cardio", "kettlebell", "smith", "isometric"]
    3. "MET": 中等强度代谢当量(如 5.0, 3.5, 8.0, 平板支撑2.5)
    4. "id": 英文/拼音
    5. "name": 规范化的中文动作名称
    输入：【${text}】`;
    const result = await askAI(promptStr);
    setIsAiLoading(false);
    if (result) {
      setSelectedEx({ ...result, name: result.name || text });
      setAiPrompt("");
      setSetsList([
        { inputWeight: result.type === "isometric" ? 0 : "", reps: "" },
      ]);
    }
  };

  const getActualWeight = (exType, inputVal) => {
    const v = Number(inputVal || 0);
    if (exType === "barbell") return v * 2 + 20;
    if (exType === "smith") return v * 2 + 10;
    if (exType === "dumbbell") return v * 2;
    if (exType === "assisted") return Math.max(0, userWeight - v);
    if (exType === "bodyweight" || exType === "isometric")
      return userWeight + v;
    return v;
  };

  const getInputLabel = () => {
    if (selectedEx?.type === "cardio") return "有氧时长(min)";
    if (selectedEx?.type === "bodyweight" || selectedEx?.type === "isometric")
      return "附加负重(kg)";
    if (selectedEx?.type === "assisted") return "助力配重(kg)";
    if (selectedEx?.type === "kettlebell") return "壶铃重量(kg)";
    if (selectedEx?.type === "machine") return "插片总重(kg)";
    if (selectedEx?.type === "barbell" || selectedEx?.type === "smith")
      return "单边杠片(kg)";
    if (selectedEx?.type === "dumbbell") return "单只重量(kg)";
    return "重量输入(kg)";
  };

  const handleSave = () => {
    let cal = 0,
      totalVol = 0;
    const finalSets = [...setsList].map((s) => ({
      inputWeight: s.inputWeight ?? 0,
      reps: s.reps ?? 0,
    }));
    if (selectedEx.type === "cardio") {
      cal = (selectedEx.MET || 7.0) * userWeight * (Number(duration || 0) / 60);
    } else {
      let totalTimeHours = 0;
      finalSets.forEach((s) => {
        s.actualWeight = getActualWeight(selectedEx.type, s.inputWeight);
        if (selectedEx.type === "isometric") {
          totalTimeHours += s.reps / 3600;
          totalVol += s.actualWeight * s.reps;
        } else {
          totalTimeHours += (s.reps * 3) / 3600;
          totalVol += s.actualWeight * s.reps;
        }
      });
      cal = (selectedEx.MET || 5.0) * userWeight * totalTimeHours;
    }
    const finalData = {
      ...selectedEx,
      duration: selectedEx.type === "cardio" ? Number(duration || 0) : null,
      setsList: selectedEx.type === "cardio" ? null : finalSets,
      calories: Math.round(cal),
      totalVolume: Math.round(totalVol),
    };
    if (addToPlan && !isEditing && !prefillData) onAppendToPlan(selectedEx);
    onAdd(finalData, editData ? editData.index : null);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="font-bold text-xl">
            {isEditing
              ? "修改记录"
              : prefillData
              ? "执行计划动作"
              : "AI 智能指令台"}
          </h3>
          <X onClick={onClose} className="cursor-pointer text-gray-400" />
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {!selectedEx && (
            <div className="animate-in fade-in space-y-4">
              <div className="flex bg-indigo-50 border border-indigo-200 rounded-2xl p-1 shadow-inner focus-within:border-indigo-400 transition-all items-center">
                {speechSupported && (
                  <button
                    onClick={isListening ? null : startListening}
                    className={`p-3 ${
                      isListening
                        ? "text-red-500 animate-pulse"
                        : "text-gray-400 hover:text-indigo-500"
                    }`}
                  >
                    <Mic size={20} />
                  </button>
                )}
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    isListening ? "正在聆听..." : "文字或语音输入动作..."
                  }
                  className="flex-1 w-full bg-transparent px-1 py-4 text-[16px] font-bold text-indigo-900 border-none focus:ring-0 outline-none placeholder-indigo-300"
                  onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                />
                <button
                  onClick={() => handleAIGenerate()}
                  disabled={isAiLoading || !aiPrompt}
                  className={`px-5 py-4 rounded-xl text-sm font-black transition-all flex items-center ${
                    isAiLoading || !aiPrompt
                      ? "bg-indigo-200 text-indigo-400"
                      : "bg-indigo-600 text-white shadow-md"
                  }`}
                >
                  {isAiLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </button>
              </div>
              <div className="pt-1 flex flex-wrap gap-2">
                {["+平板哑铃推胸", "+引体向上", "+杠铃深蹲", "+靠墙静蹲"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setAiPrompt(t.substring(1));
                        handleAIGenerate(t.substring(1));
                      }}
                      className="text-[12px] bg-gray-100 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg font-bold transition-colors"
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {selectedEx && (
            <div className="animate-in slide-in-from-right-4">
              <div className="mb-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-lg text-indigo-900 text-[16px]">
                    {selectedEx.name}
                  </h4>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase mt-1 tracking-wide">
                    {selectedEx.category} | {selectedEx.type} | MET:{" "}
                    {selectedEx.MET}
                  </p>
                </div>
                {!isEditing && !prefillData && (
                  <button
                    onClick={() => setSelectedEx(null)}
                    className="text-[12px] font-bold text-indigo-400 hover:text-indigo-700"
                  >
                    重新选择
                  </button>
                )}
              </div>

              {!isEditing && !prefillData && (
                <div className="mb-4 flex items-center space-x-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                  <input
                    type="checkbox"
                    id="addToPlan"
                    checked={addToPlan}
                    onChange={(e) => setAddToPlan(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="addToPlan"
                    className="text-xs font-bold text-indigo-800 cursor-pointer flex items-center"
                  >
                    同步加入今日专属计划
                  </label>
                </div>
              )}

              {selectedEx.type === "cardio" ? (
                <div className="bg-gray-50 p-5 rounded-3xl flex justify-between items-center border border-gray-100">
                  <span className="text-[14px] font-bold text-gray-700">
                    有氧时长 (min)
                  </span>
                  <input
                    type="number"
                    className="w-24 p-3 rounded-xl text-center font-black text-indigo-600 bg-white shadow-sm border-none text-[16px]"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="0"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_2fr_2fr_1fr] gap-2 text-[10px] font-bold text-gray-400 px-1 mb-1 text-center items-center">
                    <div>组</div>
                    <div>{getInputLabel()}</div>
                    <div>
                      {selectedEx.type === "isometric" ? "时长(秒)" : "次数"}
                    </div>
                    <div></div>
                  </div>
                  {setsList.map((set, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_2fr_2fr_1fr] gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm items-center"
                    >
                      <span className="text-[12px] font-bold text-gray-400 text-center">
                        {idx + 1}
                      </span>
                      <input
                        type="number"
                        className="w-full bg-gray-50 p-2.5 rounded-xl text-center font-black text-indigo-600 border-none text-[16px]"
                        value={set.inputWeight ?? ""}
                        onChange={(e) => {
                          const ns = [...setsList];
                          ns[idx].inputWeight =
                            e.target.value === "" ? "" : Number(e.target.value);
                          setSetsList(ns);
                        }}
                        placeholder="0"
                      />
                      <input
                        type="number"
                        className="w-full bg-gray-50 p-2.5 rounded-xl text-center font-black text-indigo-600 border-none text-[16px]"
                        value={set.reps ?? ""}
                        onChange={(e) => {
                          const ns = [...setsList];
                          ns[idx].reps =
                            e.target.value === "" ? "" : Number(e.target.value);
                          setSetsList(ns);
                        }}
                        placeholder="0"
                      />
                      <button
                        onClick={() => {
                          if (setsList.length > 1) {
                            const ns = [...setsList];
                            ns.splice(idx, 1);
                            setSetsList(ns);
                          }
                        }}
                        className="w-full h-10 flex shrink-0 items-center justify-center text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setSetsList([
                        ...setsList,
                        {
                          inputWeight:
                            setsList[setsList.length - 1].inputWeight ?? "",
                          reps: setsList[setsList.length - 1].reps ?? "",
                        },
                      ])
                    }
                    className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl text-[12px] font-bold hover:bg-gray-50 transition-colors mt-2"
                  >
                    + 添加下一组
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedEx && (
          <div className="mt-4 flex space-x-3 shrink-0">
            {isEditing && (
              <button
                onClick={() => onDelete(editData.index)}
                className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0 active:scale-95"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-transform text-[16px]"
            >
              {isEditing ? "保存修改" : "确认录入"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddDietModal({ editData, db, updateDB, onClose, onAdd, onDelete }) {
  const isEditing = !!editData;
  const initData = editData ? editData.data : null;
  const [selectedFood, setSelectedFood] = useState(initData || null);
  const [comboState, setComboState] = useState({});
  const [singleQty, setSingleQty] = useState(initData?.quantity || 1);
  const [activeTab, setActiveTab] = useState(
    initData ? initData.type : "combo"
  );

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [saveToDB, setSaveToDB] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const {
    isListening,
    supported: speechSupported,
    startListening,
  } = useSpeech((text) => setAiPrompt((prev) => prev + text));
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initData && initData.type === "combo") {
      const s = {};
      (initData.components || []).forEach((c) => {
        s[c.id] = c.isRatio ? c.currentRatio ?? 1 : c.selected ?? true;
      });
      setComboState(s);
    } else if (selectedFood && selectedFood.type === "combo" && !isEditing) {
      const s = {};
      (selectedFood.components || []).forEach((c) => {
        s[c.id] = c.isRatio ? c.defaultRatio ?? 1 : c.defaultToggle ?? true;
      });
      setComboState(s);
    }
  }, [selectedFood, initData, isEditing]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAiLoading(true);
    setAiPrompt("正在用火眼金睛分析食物...");
    try {
      const base64Image = await compressImage(file);
      const promptStr = `作为严苛的健身营养师，仔细观察图片中的食物。利用你的常识估算其大致重量或份量。
必须返回纯 JSON，严禁 markdown。
1. 如果是套餐/带配菜的餐食，使用 "combo" 类型深度拆解（主食设isRatio:true, 酱汁/油炸物/配菜设isToggle:true）。
2. 【⚠️健身特殊分离法则】(核心指令)：即使是单一食物，只要在健身界常被“去黄、去皮、去肥肉”（如茶叶蛋、白煮蛋、炸鸡腿、带膘牛排），必须强制按 "combo" 处理！将蛋黄、鸡皮、肥肉边单独设为 isToggle:true(开关项)，蛋白、纯瘦肉设为 isRatio:true。
3. 如果是无法拆分的单一食物/水果，使用 "single" 类型。如果是日常食材，"unit" 必须是中文量词且强制以100g为基准并在name中标注；如果是**健身补剂**（如蛋白粉），必须以标准单次推荐量（如 "1勺"）为基准，绝不能用100g！
⚠️极其重要红线：无论是 combo 里的 component，还是 single 的主体数据，都必须严格包含 protein, carbs, fat 三个数字字段！绝不允许三项全部为0！哪怕是蔬菜也必须有微量碳水！`;
      const result = await askVisionAI(base64Image, promptStr);
      if (result) {
        const flatFoodData = result.data
          ? { type: result.type, ...result.data }
          : result;
        flatFoodData.id = flatFoodData.id || `food_${Date.now()}`;
        if (flatFoodData.components) {
          flatFoodData.components.forEach(
            (c, i) => (c.id = c.id || `comp_${i}_${Date.now()}`)
          );
        }
        setSelectedFood(flatFoodData);
        setActiveTab(flatFoodData.type || "combo");
        setSingleQty(1);
        setAiPrompt("");
      }
    } catch (err) {
      console.warn(err);
    }
    setIsAiLoading(false);
    e.target.value = "";
  };

  const handleAIGenerate = async (promptText) => {
    const text = promptText || aiPrompt;
    if (!text) return;
    setIsAiLoading(true);
    const promptStr = `作为专业且严苛的健身营养师，精确拆解食物卡路里及三大营养素。输出纯净 JSON，严禁 markdown。
1. 【复合套餐/带配菜/快餐】(如"兰州拉面","鸭腿饭")：使用 "combo" 类型，利用你的全球饮食大数据，精准还原隐形配菜和油脂。isRatio(比例调整)主食/肉类设true。isToggle(开关)酱汁/辣油/芝士/蔬菜设true。
2. 【⚠️健身特殊分离法则】(核心指令)：即使用户输入的是单一食物，只要在健身界常被“去黄、去皮、去肥肉”（如"茶叶蛋"、"白煮蛋"、"炸鸡翅"、"西冷牛排"），必须强制按 "combo" 类型拆解！将蛋黄、鸡皮、肥肉单独拆为一个 id，并设为 isToggle:true(开关)；把蛋白、纯瘦肉设为 isRatio:true(比例)。
3. 【纯粹单一食物】(如"香蕉","紫薯","蛋白粉")：使用 "single" 类型。"unit" 必须是中文量词。如果是日常食材，强制以 100g 为基准在 name 中标注；**如果是健身补剂（如蛋白粉、肌酸），必须以标准的单次服用量（如 "勺"）为基准，绝不允许使用 100g！**
⚠️极其重要红线：不管是 combo 里的 component，还是 single 的主体数据，都必须严格包含 protein, carbs, fat 三个数字字段！绝不允许三项全部为0或缺失！
输入：【${text}】`;

    const result = await askAI(promptStr);
    setIsAiLoading(false);
    if (result) {
      const flatFoodData = result.data
        ? { type: result.type, ...result.data }
        : result;
      flatFoodData.id = flatFoodData.id || `food_${Date.now()}`;
      if (flatFoodData.components) {
        flatFoodData.components.forEach(
          (c, i) => (c.id = c.id || `comp_${i}_${Date.now()}`)
        );
      }
      setSelectedFood(flatFoodData);
      setActiveTab(flatFoodData.type || "combo");
      setSingleQty(1);
      setAiPrompt("");
    }
  };

  const handleSave = () => {
    if (selectedFood.type === "combo") {
      const finalCombo = {
        ...selectedFood,
        components: (selectedFood.components || []).map((c) => {
          const isToggleType = c.isToggle || !c.isRatio;
          return {
            ...c,
            currentRatio: c.isRatio
              ? comboState[c.id] ?? c.defaultRatio ?? 1
              : 1,
            selected: isToggleType
              ? comboState[c.id] ?? c.defaultToggle ?? true
              : true,
          };
        }),
      };
      if (
        saveToDB &&
        !isEditing &&
        !db.combo.find((w) => w.id === selectedFood.id)
      )
        updateDB("combo", selectedFood);
      onAdd(finalCombo, editData ? editData.index : null);
    } else {
      if (
        saveToDB &&
        !isEditing &&
        !db.single.find((w) => w.id === selectedFood.id)
      )
        updateDB("single", selectedFood);
      onAdd(
        { ...selectedFood, quantity: Number(singleQty) },
        editData ? editData.index : null
      );
    }
    if (isEditing) {
      onClose();
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      if (selectedFood.type === "single") setSingleQty(1);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full max-h-[85vh] flex flex-col relative overflow-hidden">
        {showToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-in fade-in slide-in-from-top-4 z-50 flex items-center whitespace-nowrap">
            <Check size={16} className="mr-1" /> 已添加，可连续录入
          </div>
        )}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="font-bold text-xl">
            {isEditing ? "修改饮食" : "AI 智能饮食库"}
          </h3>
          <X onClick={onClose} className="cursor-pointer text-gray-400" />
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {!selectedFood && (
            <div className="animate-in fade-in space-y-4">
              <div className="flex bg-indigo-50 border border-indigo-200 rounded-2xl p-1 shadow-inner focus-within:border-indigo-400 transition-all items-center">
                {speechSupported && (
                  <button
                    onClick={isListening ? null : startListening}
                    className={`p-3 ${
                      isListening
                        ? "text-red-500 animate-pulse"
                        : "text-gray-400 hover:text-indigo-500"
                    }`}
                  >
                    <Mic size={20} />
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="p-3 text-gray-400 hover:text-indigo-500"
                >
                  <Camera size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  hidden
                />
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    isListening ? "正在聆听..." : "文字/语音/拍照识别食物"
                  }
                  className="flex-1 w-full bg-transparent px-1 py-4 text-[16px] font-bold text-indigo-900 border-none focus:ring-0 outline-none placeholder-indigo-300"
                  onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                />
                <button
                  onClick={() => handleAIGenerate()}
                  disabled={isAiLoading || !aiPrompt}
                  className={`px-5 py-4 rounded-xl text-sm font-black transition-all flex items-center ${
                    isAiLoading || !aiPrompt
                      ? "bg-indigo-200 text-indigo-400"
                      : "bg-indigo-600 text-white shadow-md"
                  }`}
                >
                  {isAiLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </button>
              </div>
              <div className="pt-1 flex flex-wrap gap-2">
                {["+沙县牛腩饭", "+汉堡王皇堡", "+山药"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setAiPrompt(t.substring(1));
                      handleAIGenerate(t.substring(1));
                    }}
                    className="text-[12px] bg-gray-100 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg font-bold transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl mt-4 shrink-0">
                <button
                  onClick={() => setActiveTab("combo")}
                  className={`flex-1 py-2.5 text-[12px] font-black rounded-lg transition-colors ${
                    activeTab === "combo"
                      ? "bg-white shadow-sm text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  专属组合套餐
                </button>
                <button
                  onClick={() => setActiveTab("single")}
                  className={`flex-1 py-2.5 text-[12px] font-black rounded-lg transition-colors ${
                    activeTab === "single"
                      ? "bg-white shadow-sm text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  单品与补剂
                </button>
              </div>

              <div className="pt-3 min-h-[100px]">
                {activeTab === "combo" &&
                  (db.combo.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {db.combo.map((c, idx) => (
                        <button
                          key={c.id || `combo_${idx}`}
                          onClick={() =>
                            setSelectedFood({ type: "combo", ...c })
                          }
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-[12px] text-gray-400 font-medium">
                      尚未保存过专属套餐
                    </div>
                  ))}
                {activeTab === "single" &&
                  (db.single.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {db.single.map((s, idx) => (
                        <button
                          key={s.id || `single_${idx}`}
                          onClick={() =>
                            setSelectedFood({ type: "single", ...s })
                          }
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-[12px] text-gray-400 font-medium">
                      尚未保存过单品/水果
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedFood?.type === "combo" && (
            <div className="animate-in slide-in-from-right-4 space-y-4">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                <h4 className="font-black text-lg text-indigo-900 text-[16px]">
                  {selectedFood.name}
                </h4>
                {!isEditing && (
                  <button
                    onClick={() => setSelectedFood(null)}
                    className="text-[12px] font-bold text-indigo-400"
                  >
                    重新选择
                  </button>
                )}
              </div>

              {!isEditing &&
                !db.combo.find((w) => w.id === selectedFood.id) && (
                  <div className="flex items-center space-x-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <input
                      type="checkbox"
                      id="saveDiet"
                      checked={saveToDB}
                      onChange={(e) => setSaveToDB(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="saveDiet"
                      className="text-[12px] font-bold text-emerald-700 cursor-pointer"
                    >
                      存入常用套餐库
                    </label>
                  </div>
                )}

              <div className="space-y-4">
                {(selectedFood.components || []).map((comp) => {
                  const isToggleType = comp.isToggle || !comp.isRatio;
                  const currentRatio = comp.isRatio
                    ? comboState[comp.id] ?? comp.defaultRatio ?? 1
                    : 1;
                  const isSelected = isToggleType
                    ? comboState[comp.id] ?? comp.defaultToggle ?? true
                    : true;
                  const multiplier = comp.isRatio
                    ? currentRatio
                    : isSelected
                    ? 1
                    : 0;
                  const protein = comp.protein || 0;
                  const carbs = comp.carbs || 0;
                  const fat = comp.fat || 0;
                  const totalCal =
                    (protein * 4 + carbs * 4 + fat * 9) * multiplier;

                  return (
                    <div
                      key={comp.id}
                      className="bg-gray-50 p-5 rounded-3xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex justify-between text-sm font-black mb-3">
                        <span className="text-gray-800 text-[14px]">
                          {comp.name}
                        </span>
                        <span className="text-indigo-600 text-[14px]">
                          {comp.isRatio
                            ? `${(currentRatio * 100).toFixed(0)}%`
                            : isSelected
                            ? "包含"
                            : "不含"}
                        </span>
                      </div>
                      {comp.isRatio ? (
                        <input
                          type="range"
                          min="0"
                          max={comp.maxRatio || 3}
                          step="0.25"
                          value={currentRatio}
                          onChange={(e) =>
                            setComboState({
                              ...comboState,
                              [comp.id]: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            setComboState({
                              ...comboState,
                              [comp.id]: !isSelected,
                            })
                          }
                          className={`w-full py-3 rounded-xl text-[12px] font-black border transition-all ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md border-indigo-600"
                              : "bg-white text-gray-400 border-gray-200"
                          }`}
                        >
                          {isSelected ? "已选择包含" : "点击选择包含"}
                        </button>
                      )}
                      <div className="text-[10px] text-gray-400 mt-3 font-medium bg-white p-2 rounded-xl inline-block shadow-sm">
                        物理锁死热量:{" "}
                        <span className="text-gray-700 font-bold">
                          {Math.round(totalCal)}
                        </span>{" "}
                        kcal | 蛋白:{Math.round(protein * multiplier)} 碳水:
                        {Math.round(carbs * multiplier)} 脂肪:
                        {Math.round(fat * multiplier)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedFood?.type === "single" && (
            <div className="animate-in slide-in-from-right-4 space-y-4">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-lg text-indigo-900 text-[16px]">
                    {selectedFood.name}
                  </h4>
                  <p className="text-[10px] text-indigo-500 font-bold mt-1">
                    单份基准:{" "}
                    {Math.round(
                      (selectedFood.protein || 0) * 4 +
                        (selectedFood.carbs || 0) * 4 +
                        (selectedFood.fat || 0) * 9
                    )}{" "}
                    kcal / {selectedFood.unit}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setSelectedFood(null)}
                    className="text-[12px] font-bold text-indigo-400"
                  >
                    重新选择
                  </button>
                )}
              </div>

              {!isEditing &&
                !db.single.find((w) => w.id === selectedFood.id) && (
                  <div className="flex items-center space-x-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <input
                      type="checkbox"
                      id="saveDietSingle"
                      checked={saveToDB}
                      onChange={(e) => setSaveToDB(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="saveDietSingle"
                      className="text-[12px] font-bold text-emerald-700 cursor-pointer"
                    >
                      存入常用单品库
                    </label>
                  </div>
                )}

              <div className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-800 text-[14px]">
                    摄入数量
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    合计:{" "}
                    {Math.round(
                      ((selectedFood.protein || 0) * 4 +
                        (selectedFood.carbs || 0) * 4 +
                        (selectedFood.fat || 0) * 9) *
                        singleQty
                    )}{" "}
                    kcal
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                  <button
                    onClick={() =>
                      setSingleQty(Math.max(0.1, Number(singleQty) - 0.5))
                    }
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg font-black text-lg text-gray-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={singleQty}
                    onChange={(e) => setSingleQty(e.target.value)}
                    className="font-black text-[16px] w-12 text-center text-indigo-600 bg-transparent border-none p-0 focus:ring-0"
                  />
                  <button
                    onClick={() => setSingleQty(Number(singleQty) + 0.5)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg font-black text-lg text-indigo-600"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedFood && (
          <div className="mt-4 flex space-x-3 shrink-0">
            {isEditing && (
              <button
                onClick={() => onDelete(editData.index)}
                className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0 active:scale-95"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-black shadow-xl active:scale-95 transition-transform text-[16px]"
            >
              {isEditing ? "保存修改" : "确认录入"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddDrinkModal({ onClose, onAdd }) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const {
    isListening,
    supported: speechSupported,
    startListening,
  } = useSpeech((text) => setAiPrompt((prev) => prev + text));

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    const promptStr = `作为健身营养师，精确拆解用户喝的液体饮品。
必须返回纯净 JSON，严禁 markdown。
要求：
1. "type" 固定为 "drink"
2. "data" 包含: "id"(英文), "name"(包含毫升,如"生椰拿铁(300ml)"), "unit"(固定为"杯"或"瓶"), "volume"(纯数字毫升), "protein", "carbs", "fat"。
输入：【${aiPrompt}】`;

    const result = await askAI(promptStr);
    setIsAiLoading(false);
    if (result) {
      const finalDrink = {
        type: "drink",
        ...(result.data || result),
        quantity: 1,
      };
      onAdd(finalDrink);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="font-bold text-xl">AI 智能饮品录入</h3>
          <X onClick={onClose} className="cursor-pointer text-gray-400" />
        </div>
        <div className="flex bg-sky-50 border border-sky-200 rounded-2xl p-1 shadow-inner focus-within:border-sky-400 transition-all items-center mb-4">
          {speechSupported && (
            <button
              onClick={isListening ? null : startListening}
              className={`p-3 ${
                isListening
                  ? "text-red-500 animate-pulse"
                  : "text-gray-400 hover:text-sky-500"
              }`}
            >
              <Mic size={20} />
            </button>
          )}
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={isListening ? "正在聆听..." : "文字或语音输入饮品..."}
            className="flex-1 w-full bg-transparent px-1 py-4 text-[16px] font-bold text-sky-900 border-none focus:ring-0 outline-none placeholder-sky-300"
            onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
          />
          <button
            onClick={handleAIGenerate}
            disabled={isAiLoading || !aiPrompt}
            className={`px-5 py-4 rounded-xl text-sm font-black transition-all flex items-center ${
              isAiLoading || !aiPrompt
                ? "bg-sky-200 text-sky-400"
                : "bg-sky-500 text-white shadow-md"
            }`}
          >
            {isAiLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "解析并记录"
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">
          系统会自动分析热量，并提取毫升数计入水杯进度
        </p>
      </div>
    </div>
  );
}

function CalendarModal({
  onClose,
  currentDate,
  onSelectDate,
  records,
  localTodayStr,
}) {
  const [viewDate, setViewDate] = useState(() => {
    const [y, m, d] = currentDate.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => {
    const nextMonth = new Date(year, month + 1, 1);
    const todayObj = new Date(
      localTodayStr.split("-")[0],
      localTodayStr.split("-")[1] - 1,
      1
    );
    if (nextMonth <= todayObj) setViewDate(nextMonth);
  };
  const isNextMonthDisabled =
    new Date(year, month + 1, 1) >
    new Date(localTodayStr.split("-")[0], localTodayStr.split("-")[1] - 1, 1);

  const renderGrid = () => {
    const grid = [];
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    grid.push(
      <div key="header" className="grid grid-cols-7 gap-1 mb-4 text-center">
        {weekDays.map((wd) => (
          <div key={wd} className="text-xs font-bold text-gray-400">
            {wd}
          </div>
        ))}
      </div>
    );
    const days = [];
    for (let i = 0; i < firstDay; i++)
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`;
      const isSelected = dateStr === currentDate;
      const isToday = dateStr === localTodayStr;
      const isFuture = dateStr > localTodayStr;
      const dayRec = records[dateStr];
      const hasData =
        dayRec &&
        (dayRec.workouts?.length > 0 ||
          dayRec.diet?.length > 0 ||
          dayRec.water?.basic > 0 ||
          dayRec.water?.coffee > 0);
      days.push(
        <div key={i} className="flex justify-center items-center h-10">
          <button
            disabled={isFuture}
            onClick={() => onSelectDate(dateStr)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isFuture ? "text-gray-300 cursor-not-allowed" : ""
            } ${
              !isFuture && !isSelected ? "text-gray-700 hover:bg-gray-100" : ""
            } ${isSelected ? "bg-indigo-600 text-white shadow-md" : ""} ${
              isToday && !isSelected
                ? "border border-indigo-500 text-indigo-600"
                : ""
            }`}
          >
            {i}
            {hasData && !isSelected && !isFuture && (
              <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>
            )}
            {hasData && isSelected && (
              <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>
            )}
          </button>
        </div>
      );
    }
    grid.push(
      <div key="days" className="grid grid-cols-7 gap-y-2">
        {days}
      </div>
    );
    return grid;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] p-6 w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">选择历史日期</h3>
          <X onClick={onClose} className="text-gray-400 cursor-pointer" />
        </div>
        <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 rounded-2xl">
          <button
            onClick={handlePrevMonth}
            className="p-2 bg-white rounded-xl shadow-sm text-gray-600 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-black text-gray-800 tracking-wider">
            {year}年 {month + 1}月
          </span>
          <button
            onClick={handleNextMonth}
            disabled={isNextMonthDisabled}
            className={`p-2 rounded-xl transition-all ${
              isNextMonthDisabled
                ? "text-gray-300"
                : "bg-white shadow-sm text-gray-600 active:scale-95"
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="mb-4">{renderGrid()}</div>
      </div>
    </div>
  );
}
