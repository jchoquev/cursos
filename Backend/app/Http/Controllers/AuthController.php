<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Handle authentication and token generation.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // API móvil/tokenizada: comprobar credenciales sin crear una sesión web.
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Credenciales incorrectas. Intente nuevamente.',
            ], 401);
        }

        // No acumular tokens en cada login: este nombre representa al cliente
        // principal de la aplicación y su token anterior queda revocado.
        $user->tokens()->where('name', 'auth_token')->delete();

        $token = $user->createToken(
            'auth_token',
            $user->role === 'Administrador' ? ['admin'] : ['user'],
            now()->addMinutes(30)
        )->plainTextToken;

        return response()->json([
            'status' => 'success',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'dni' => $user->dni,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Revoke only the token used by the current API request.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }
}
